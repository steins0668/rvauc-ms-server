import { SQLWrapper } from "drizzle-orm";
import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Enums } from "../../../../../data";
import { Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";

export namespace AttendanceData {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const professorRepo = new Auth.Repositories.Professor(context);
    const studentRepo = new Auth.Repositories.Student(context);
    return new Service({
      attendanceRecordRepo,
      classRepo,
      classOfferingRepo,
      professorRepo,
      studentRepo,
    });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classRepo: CoreRepositories.Class;
    private readonly _classOfferingRepo: CoreRepositories.ClassOffering;
    private readonly _professorRepo: Auth.Repositories.Professor;
    private readonly _studentRepo: Auth.Repositories.Student;

    constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classRepo: CoreRepositories.Class;
      classOfferingRepo: CoreRepositories.ClassOffering;
      professorRepo: Auth.Repositories.Professor;
      studentRepo: Auth.Repositories.Student;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classRepo = args.classRepo;
      this._classOfferingRepo = args.classOfferingRepo;
      this._professorRepo = args.professorRepo;
      this._studentRepo = args.studentRepo;
    }

    async getAttendance(
      args: QueryArgs & {
        queryContext: Schemas.MethodArgs.AttendanceQuery.All;
      },
    ) {
      const { queryContext } = args;

      switch (queryContext.roleScope) {
        case "professor-class": {
          return await this.getClassAttendanceProfessorView({
            ...args,
            values: queryContext.values,
          });
        }
        case "student-class": {
          return await this.getClassAttendanceStudentView({
            ...args,
            values: queryContext.values,
          });
        }
        case "professor-student": {
          return await this.getStudentAttendanceProfessorView({
            ...args,
            values: queryContext.values,
          });
        }
        default:
          throw new Auth.Core.Errors.Authentication.ErrorClass({
            name: "AUTHENTICATION_FORBIDDEN_ROLE_ERROR",
            message: `Role not supported.`,
          });
      }
    }

    private async getClassAttendanceProfessorView(
      args: QueryArgs & {
        values: {
          termId: number;
          classId: number;
          professorId: number;
          date: Date;
        };
      },
    ) {
      const { termId, classId, professorId, date } = args.values;

      let classOffering;

      //  * get the class along with enrollments
      try {
        classOffering = await this.queryClassOfferingWithClass({
          values: { classId, date },
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying class_offerings table.",
            err,
          }),
        );
      }

      if (!classOffering)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
          message:
            "Provided class has no existing schedule at the provided date.",
        });

      let enrollmentsWithStudents;

      try {
        enrollmentsWithStudents = await this.queryEnrollmentsWithStudents({
          ...args,
          values: { classOfferingId: classOffering.id },
        });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying enrollments table.",
            err,
          }),
        );
      }

      let attendanceRecords: Awaited<
        ReturnType<typeof this.queryAttendanceRecords>
      > = [];

      if (enrollmentsWithStudents.length) {
        const studentIds = enrollmentsWithStudents.map((e) => e.student.id);

        const { startTime, endTime } = classOffering;
        const timeRange = TimeUtil.getPhTimeRange(
          date,
          startTime - 30 * 60,
          endTime,
        );

        //  * get attendance records matching the schedule of the class

        try {
          attendanceRecords = await this.queryAttendanceRecords({
            ...args,
            values: { classId, timeRange, studentIds },
          });
        } catch (err) {
          return ResultBuilder.fail(
            Core.Errors.EnrollmentData.normalizeError({
              name: "ENROLLMENT_DATA_QUERY_ERROR",
              message: "Failed querying attendance_records table.",
              err,
            }),
          );
        }
      }

      try {
        return ResultBuilder.success(
          this.toClassAttendanceProfessorViewDto(
            classOffering,
            enrollmentsWithStudents,
            attendanceRecords,
          ),
        );
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          }),
        );
      }
    }
    private async getClassAttendanceStudentView(
      args: QueryArgs & {
        values: {
          classId: number;
          studentId: number;
        };
      },
    ) {
      const { classId, studentId } = args.values;

      let queried;

      try {
        queried = await this.queryAttendanceRecords({
          ...args,
          values: {
            classId,
            studentIds: [studentId],
          },
        });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed getting attendance records for student.",
            err,
          }),
        );
      }

      try {
        const dto = this.toClassAttendanceStudentViewDto(queried);
        return ResultBuilder.success(dto);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          }),
        );
      }
    }
    private async getStudentAttendanceProfessorView(
      args: QueryArgs & {
        values: {
          termId: number;
          classId: number;
          studentId: number;
          date: Date;
        };
      },
    ) {
      const { dbOrTx, constraints, values } = args;

      let student;

      try {
        student = await this.queryStudents({
          dbOrTx,
          constraints: { limit: 1 },
          values: { studentIds: [values.studentId] },
        }).then((result) => result[0]);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying students table.",
            err,
          }),
        );
      }

      if (!student)
        return ResultBuilder.fail(
          new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_STUDENT_NOT_FOUND_ERROR",
            message: "Student with the specified id does not exist.",
          }),
        );

      let class_;

      try {
        class_ = await this.queryClasses({
          dbOrTx: args.dbOrTx,
          constraints: { limit: 1 },
          values: { classIds: [values.classId] },
        }).then((result) => result[0]);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying classes table",
            err,
          }),
        );
      }

      if (!class_)
        return ResultBuilder.fail(
          new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
            message: "Class with specified id does not exist.",
          }),
        );

      let attendanceRecord;

      try {
        attendanceRecord = await this.queryAttendanceRecordsWithClassOfferings({
          values: { classId: values.classId, studentIds: [values.studentId] },
          constraints,
          dbOrTx,
        });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying attendance_records table.",
            err,
          }),
        );
      }

      if (!attendanceRecord)
        return ResultBuilder.fail(
          new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
            message: "Class with specified id does not exist.",
          }),
        );

      return ResultBuilder.success(
        this.toStudentAttendanceProfessorViewDto(
          class_,
          student,
          attendanceRecord,
        ),
      );
    }

    /**
     * @description transforms the data retrieved by `queryClassAttendance` into a dto. Normalizes missing
     * attendance records by setting "absent" as the default value for the "status" field and "N/A" for the others.
     */
    private toClassAttendanceProfessorViewDto(
      classOffering: NonNullable<
        Awaited<ReturnType<typeof this.queryClassOfferingWithClass>>
      >,
      enrollmentsWithStudents: Awaited<
        ReturnType<typeof this.queryEnrollmentsWithStudents>
      >,
      attendanceRecords: Awaited<
        ReturnType<typeof this.queryAttendanceRecords>
      >,
    ): Schemas.Dto.ClassAttendance.ProfessorView {
      const { professor, course, ...classMetadata } = classOffering.class;

      const attendanceMap = new Map<
        number,
        (typeof attendanceRecords)[number]
      >();

      for (const ar of attendanceRecords) attendanceMap.set(ar.studentId, ar);

      const dto = {
        attendanceRecords: enrollmentsWithStudents.map((e) => {
          const { student } = e;

          const studentAttendance = attendanceMap.get(student.id);

          const status =
            studentAttendance?.status ?? Data.attendanceStatus.absent;
          const date = studentAttendance?.datePh ?? "N/A";
          const time = studentAttendance?.recordedAt
            ? TimeUtil.toPhTime(new Date(studentAttendance.recordedAt))
            : "N/A";

          return {
            student: {
              ...student,
              department: student.department ?? "No department.",
            },
            record: {
              id: studentAttendance?.id ?? 0,
              status,
              date,
              time,
            },
          };
        }),
        scheduledClass: {
          room: classOffering.rooms?.name ?? "N/A",
          ...classOffering,
          classId: classMetadata.id,
          classNumber: classMetadata.classNumber,
          courseCode: course.code,
          courseName: course.name,
          professor: { ...professor.user },
        },
      };

      return Schemas.Dto.ClassAttendance.professorView.parse(dto);
    }

    private toClassAttendanceStudentViewDto(
      attendanceRecords: Awaited<
        ReturnType<typeof this.queryAttendanceRecords>
      >,
    ) {
      const dto = {
        attendanceRecords: attendanceRecords.map((ar) => {
          return {
            id: ar.id,
            status: ar.status,
            date: ar.datePh,
            time: TimeUtil.toPhTime(new Date(ar.recordedAt)),
          };
        }),
      };

      return Schemas.Dto.ClassAttendance.studentView.parse(dto);
    }

    private toStudentAttendanceProfessorViewDto(
      class_: Awaited<ReturnType<typeof this.queryClasses>>[number],
      student: Awaited<ReturnType<typeof this.queryStudents>>[number],
      attendanceRecords: Awaited<
        ReturnType<typeof this.queryAttendanceRecordsWithClassOfferings>
      >,
    ): Schemas.Dto.StudentAttendance.ProfessorView {
      const { course } = class_;
      return {
        classDetails: {
          class: {
            id: class_.id,
            classNumber: class_.classNumber,
          },
          course: { code: course.code, name: course.name },
        },
        student: {
          studentNumber: student.studentNumber,
          department: student.department.name,
          yearLevel: student.yearLevel,
          block: student.block,
          surname: student.user.surname,
          firstName: student.user.firstName,
          middleName: student.user.middleName,
          gender: student.user.gender,
        },
        attendanceRecords:
          Schemas.Dto.StudentAttendance.attendanceRecords.parse(
            attendanceRecords.map((ar) => {
              return {
                classOfferingDetails: {
                  id: ar.classOffering.id,
                  weekDay: ar.classOffering.weekDay,
                  room: ar.classOffering.rooms?.name ?? "N/A",
                  startTimeText: ar.classOffering.startTimeText,
                  endTimeText: ar.classOffering.endTimeText,
                  startTime: ar.classOffering.startTime,
                  endTime: ar.classOffering.endTime,
                },
                record: {
                  id: ar.id,
                  status: ar.status,
                  date: ar.datePh,
                  time: TimeUtil.toPhTime(new Date(ar.recordedAt)),
                },
              };
            }),
          ),
      };
    }

    /**
     * @description Queries the class offering schedule linked to the class
     * id that best matches the current date and time.
     * ! ALERT: current system design does not allow for cross-day schedules (e.g. 11:00 PM - 1:00 AM)
     */
    private async queryClassOfferingWithClass(args: {
      values: { classId: number; date: Date };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, date } = args.values;
      const day = Enums.Days[date.getDay()] as string;
      const weekDay = day.substring(0, 3);
      const seconds = TimeUtil.secondsSinceMidnightPh(date);

      return await this._classOfferingRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: (query) =>
          query.findFirst({
            where: (co, { and, eq, lte }) =>
              and(
                eq(co.classId, classId),
                eq(co.weekDay, weekDay),
                lte(co.startTime, seconds),
              ),
            orderBy: (co, { desc }) => desc(co.startTime),
            columns: { classId: false },
            with: {
              class: {
                columns: { id: true, classNumber: true },
                with: {
                  course: { columns: { code: true, name: true } },
                  professor: {
                    columns: {},
                    with: {
                      user: {
                        columns: {
                          firstName: true,
                          middleName: true,
                          surname: true,
                        },
                      },
                    },
                  },
                },
              },
              rooms: { columns: { name: true } },
            },
          }),
      });
    }

    /**
     * @description Queries enrollments linked to a class offering.
     * Paginated.
     */
    private async queryEnrollmentsWithStudents(
      args: QueryArgs & {
        values: { classOfferingId: number };
      },
    ) {
      const { dbOrTx = await createContext() } = args;
      const { limit = 6, page = 1 } = args.constraints ?? {};

      const { departments, enrollments, students, users } = Schema;
      const { eq } = RepositoryUtil.filters;
      const { asc } = RepositoryUtil.orderOperators;

      return await dbOrTx
        .select({
          student: {
            id: students.id,
            studentNumber: students.studentNumber,
            department: departments.name,
            yearLevel: students.yearLevel,
            block: students.block,
            gender: users.gender,
            surname: users.surname,
            firstName: users.firstName,
            middleName: users.middleName,
          },
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .leftJoin(departments, eq(students.departmentId, departments.id))
        .innerJoin(users, eq(students.id, users.id))
        .where(eq(enrollments.classOfferingId, args.values.classOfferingId))
        .orderBy(
          asc(users.surname),
          asc(users.firstName),
          asc(users.middleName),
          asc(users.id),
        )
        .limit(limit)
        .offset((page - 1) * limit);
    }

    /**
     * @description Queries attendance records matching a class id, time range, and
     * a set of student ids
     */
    private async queryAttendanceRecords(args: {
      values: {
        classId: number;
        timeRange?:
          | Partial<{ startTimeMs: number; endTimeMs: number }>
          | undefined;
        studentIds: number[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, timeRange, studentIds } = args.values;

      return await this._attendanceRecordRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: (query) =>
          query.findMany({
            where: (ar, { inArray, and, eq, gte, lte }) => {
              const conditions: (SQLWrapper | undefined)[] = [
                inArray(ar.studentId, studentIds),
                eq(ar.classId, classId),
              ];

              if (timeRange) {
                const timeRangeConditions: (SQLWrapper | undefined)[] = [];

                if (timeRange.startTimeMs)
                  timeRangeConditions.push(
                    gte(ar.recordedMs, timeRange.startTimeMs),
                  );
                if (timeRange.endTimeMs)
                  timeRangeConditions.push(
                    lte(ar.recordedMs, timeRange.endTimeMs),
                  );

                conditions.push(and(...timeRangeConditions));
              }

              return and(...conditions);
            },
            orderBy: (ar, { desc }) => desc(ar.recordedMs),
            columns: {
              classId: false,
              classOfferingId: false,
              recordCount: false,
              recordedMs: false,
            },
          }),
      });
    }

    private async queryAttendanceRecordsWithClassOfferings(
      args: QueryArgs & {
        values: {
          classId: number;
          timeRange?: { startTimeMs: number; endTimeMs: number } | undefined;
          studentIds: number[];
        };
      },
    ) {
      const { constraints, values } = args;
      const { limit = 6, page = 1 } = constraints ?? {};
      const { classId, timeRange, studentIds } = values;

      return await this._attendanceRecordRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: (query) =>
          query.findMany({
            where: (ar, { inArray, and, eq, gte, lte }) => {
              const conditions: (SQLWrapper | undefined)[] = [
                inArray(ar.studentId, studentIds),
                eq(ar.classId, classId),
              ];

              if (timeRange) {
                const timeRangeConditions: (SQLWrapper | undefined)[] = [];

                if (timeRange.startTimeMs)
                  timeRangeConditions.push(
                    gte(ar.recordedMs, timeRange.startTimeMs),
                  );
                if (timeRange.endTimeMs)
                  timeRangeConditions.push(
                    lte(ar.recordedMs, timeRange.endTimeMs),
                  );

                conditions.push(and(...timeRangeConditions));
              }

              return and(...conditions);
            },
            orderBy: (ar, { desc }) => desc(ar.recordedMs),
            limit,
            offset: (page - 1) * limit,
            columns: {
              classId: false,
              classOfferingId: false,
              recordCount: false,
              recordedMs: false,
            },
            with: {
              classOffering: {
                columns: {
                  classId: false,
                  roomId: false,
                },
                with: { rooms: { columns: { name: true } } },
              },
            },
          }),
      });
    }

    private async queryStudents(
      args: QueryArgs & { values: { studentIds: number[] } },
    ) {
      const { limit = 6, page = 1 } = args.constraints ?? {};

      return await this._studentRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: async (query) =>
          query.findMany({
            where: (s, { inArray }) => inArray(s.id, args.values.studentIds),
            orderBy: (s, { asc }) => asc(s.studentNumber), //   ! should be user input eventually
            limit,
            offset: (page - 1) * limit,
            columns: { studentNumber: true, yearLevel: true, block: true },
            with: {
              user: {
                columns: {
                  surname: true,
                  firstName: true,
                  middleName: true,
                  gender: true,
                },
              },
              department: {
                columns: { name: true },
                with: { college: { columns: { name: true } } },
              },
            },
          }),
      });
    }

    private async queryClasses(
      args: QueryArgs & { values: { classIds: number[] } },
    ) {
      const { limit = 6, page = 1 } = args.constraints ?? {};

      return await this._classRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: async (query) =>
          query.findMany({
            where: (c, { inArray }) => inArray(c.id, args.values.classIds),
            orderBy: (c, { asc }) => asc(c.id), //  ! should be user input eventually
            limit,
            offset: (page - 1) * limit,
            columns: { id: true, classNumber: true, professorId: true },
            with: { course: { columns: { code: true, name: true } } },
          }),
      });
    }
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    dbOrTx?: DbOrTx | undefined;
  };
}
