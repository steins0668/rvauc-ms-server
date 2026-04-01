import { SQLWrapper } from "drizzle-orm";
import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Enums } from "../../../../../data";
import { attendanceRecords, Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { BaseRepositoryType } from "../../../../../types";

export namespace AttendanceData {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    const professorRepo = new Auth.Repositories.Professor(context);
    const studentRepo = new Auth.Repositories.Student(context);
    return new Service({
      attendanceRecordRepo,
      classRepo,
      classOfferingRepo,
      enrollmentRepo,
      professorRepo,
      studentRepo,
    });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classRepo: CoreRepositories.Class;
    private readonly _classOfferingRepo: CoreRepositories.ClassOffering;
    private readonly _enrollmentRepo: CoreRepositories.Enrollment;
    private readonly _professorRepo: Auth.Repositories.Professor;
    private readonly _studentRepo: Auth.Repositories.Student;

    constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classRepo: CoreRepositories.Class;
      classOfferingRepo: CoreRepositories.ClassOffering;
      enrollmentRepo: CoreRepositories.Enrollment;
      professorRepo: Auth.Repositories.Professor;
      studentRepo: Auth.Repositories.Student;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classRepo = args.classRepo;
      this._classOfferingRepo = args.classOfferingRepo;
      this._enrollmentRepo = args.enrollmentRepo;
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
      const { values } = args;
      const { limit = 6, page = 1 } = args.constraints ?? {};

      let classOffering;

      //  * get the class along with enrollments
      try {
        const { classId, date } = values;
        const day = Enums.Days[date.getDay()] as string;
        const weekDay = day.substring(0, 3);
        const seconds = TimeUtil.secondsSinceMidnightPh(date);

        classOffering = await this._classOfferingRepo
          .queryWithClassAndProfessor({
            constraints: { limit: 1 },
            orderBy: (co, { desc }) => desc(co.startTime),
            where: (co, { and, eq, lte }) =>
              and(
                eq(co.classId, classId),
                eq(co.weekDay, weekDay),
                lte(co.startTime, seconds),
              ),
          })
          .then((result) => result[0]);
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
        const { enrollments: e, users: u } = Schema;
        const { eq } = RepositoryUtil.filters;
        const { asc } = RepositoryUtil.orderOperators;

        enrollmentsWithStudents =
          await this._enrollmentRepo.selectStudentsFromEnrollments({
            constraints: { limit, offset: (page - 1) * limit },
            where: eq(e.classOfferingId, classOffering.id),
            orderBy: [
              asc(u.surname),
              asc(u.firstName),
              asc(u.middleName),
              asc(u.id),
            ],
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
          values.date,
          startTime - 30 * 60,
          endTime,
        );

        //  * get attendance records matching the schedule of the class

        try {
          attendanceRecords = await this.queryAttendanceRecords({
            ...args,
            values: { classId: values.classId, timeRange, studentIds },
            constraints: { limit, offset: (page - 1) * limit },
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
      const { limit = 6, page = 1 } = args.constraints ?? {};

      let queried;

      try {
        queried = await this.queryAttendanceRecords({
          ...args,
          values: {
            classId,
            studentIds: [studentId],
          },
          constraints: { limit, offset: (page - 1) * limit },
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
      const { dbOrTx, values } = args;

      let student;

      try {
        student = await this._studentRepo
          .queryWithUserAndDepartment({
            where: (s, { eq }) => eq(s.id, values.studentId),
            orderBy: (s, { asc }) => asc(s.studentNumber), //   ! should be user input eventually
            constraints: { limit: 1 },
            dbOrTx,
          })
          .then((result) => result[0]);
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
        class_ = await this._classRepo
          .queryWithCourse({
            where: (c, { eq }) => eq(c.id, values.classId),
            orderBy: (c, { asc }) => asc(c.id), //  ! should be user input eventually
          })
          .then((result) => result[0]);
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
        attendanceRecord =
          await this._attendanceRecordRepo.queryMinimalShapeWithClassOfferings({
            where: (ar, { and, eq }) =>
              and(
                eq(ar.studentId, values.studentId),
                eq(ar.classId, values.classId),
              ),
            orderBy: (ar, { desc }) => desc(ar.recordedMs),
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
        Awaited<
          ReturnType<
            CoreRepositories.ClassOffering["queryWithClassAndProfessor"]
          >
        >[number]
      >,
      enrollmentsWithStudents: Awaited<
        ReturnType<CoreRepositories.Enrollment["selectStudentsFromEnrollments"]>
      >,
      attendanceRecords: Awaited<
        ReturnType<typeof this.queryAttendanceRecords>
      >,
    ): Schemas.Dto.ClassAttendance.ProfessorView {
      const { professor, course, ...class_ } = classOffering.class;

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
        class: {
          id: class_.id,
          classNumber: class_.classNumber,
          course,
          offering: {
            id: classOffering.id,
            weekDay: classOffering.weekDay,
            room: classOffering.rooms?.name ?? "N/A",
            startTimeText: classOffering.startTimeText,
            endTimeText: classOffering.endTimeText,
            startTime: classOffering.startTime,
            endTime: classOffering.endTime,
          },
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
      class_: Awaited<
        ReturnType<CoreRepositories.Class["queryWithCourse"]>
      >[number],
      student: Awaited<
        ReturnType<Auth.Repositories.Student["queryWithUserAndDepartment"]>
      >[number],
      attendanceRecords: Awaited<
        ReturnType<
          Repositories.AttendanceRecord["queryMinimalShapeWithClassOfferings"]
        >
      >,
    ): Schemas.Dto.StudentAttendance.ProfessorView {
      const { course } = class_;
      return {
        class: {
          id: class_.id,
          classNumber: class_.classNumber,
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
                classOffering: {
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
      constraints?: BaseRepositoryType.QueryConstraints;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, timeRange, studentIds } = args.values;

      return await this._attendanceRecordRepo.queryMinimalShape({
        constraints: args.constraints,
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
              timeRangeConditions.push(lte(ar.recordedMs, timeRange.endTimeMs));

            conditions.push(and(...timeRangeConditions));
          }

          return and(...conditions);
        },
        orderBy: (ar, { desc }) => desc(ar.recordedMs),
      });

      // return await this._attendanceRecordRepo.execQuery({
      //   dbOrTx: args.dbOrTx,
      //   fn: (query) =>
      //     query.findMany({
      //       where: (ar, { inArray, and, eq, gte, lte }) => {
      //         const conditions: (SQLWrapper | undefined)[] = [
      //           inArray(ar.studentId, studentIds),
      //           eq(ar.classId, classId),
      //         ];

      //         if (timeRange) {
      //           const timeRangeConditions: (SQLWrapper | undefined)[] = [];

      //           if (timeRange.startTimeMs)
      //             timeRangeConditions.push(
      //               gte(ar.recordedMs, timeRange.startTimeMs),
      //             );
      //           if (timeRange.endTimeMs)
      //             timeRangeConditions.push(
      //               lte(ar.recordedMs, timeRange.endTimeMs),
      //             );

      //           conditions.push(and(...timeRangeConditions));
      //         }

      //         return and(...conditions);
      //       },
      //       orderBy: (ar, { desc }) => desc(ar.recordedMs),
      //       columns: {
      //         classId: false,
      //         classOfferingId: false,
      //         recordCount: false,
      //         recordedMs: false,
      //       },
      //     }),
      // });
    }
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    dbOrTx?: DbOrTx | undefined;
  };
}
