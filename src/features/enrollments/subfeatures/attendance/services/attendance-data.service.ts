import { SQLWrapper } from "drizzle-orm";
import {
  createContext,
  DbOrTx,
  TxContext,
} from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../../utils";
import { BaseRepositoryType } from "../../../../../types";
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
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    const professorRepo = new Auth.Repositories.Professor(context);
    const studentRepo = new Auth.Repositories.Student(context);
    return new Service({
      attendanceRecordRepo,
      classRepo,
      classOfferingRepo,
      classSessionRepo,
      enrollmentRepo,
      professorRepo,
      studentRepo,
    });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classRepo: CoreRepositories.Class;
    private readonly _classOfferingRepo: CoreRepositories.ClassOffering;
    private readonly _classSessionRepo: CoreRepositories.ClassSession;
    private readonly _enrollmentRepo: CoreRepositories.Enrollment;
    private readonly _professorRepo: Auth.Repositories.Professor;
    private readonly _studentRepo: Auth.Repositories.Student;

    constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classRepo: CoreRepositories.Class;
      classOfferingRepo: CoreRepositories.ClassOffering;
      classSessionRepo: CoreRepositories.ClassSession;
      enrollmentRepo: CoreRepositories.Enrollment;
      professorRepo: Auth.Repositories.Professor;
      studentRepo: Auth.Repositories.Student;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classRepo = args.classRepo;
      this._classOfferingRepo = args.classOfferingRepo;
      this._classSessionRepo = args.classSessionRepo;
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
          classSessionId: number;
          professorId: number;
        };
      },
    ) {
      const { values } = args;
      const { classSessionId } = values;
      const { limit = 6, page = 1 } = args.constraints ?? {};

      let session;
      let enrollmentsData;
      let recordsAndSummary: Awaited<
        ReturnType<typeof this.queryRecordsAndSummary>
      > = {
        records: [],
        summary: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          totalRecords: 0,
        },
      };

      try {
        session = await this.getSessionDetails(args);
        enrollmentsData = await this.queryEnrollmentsForClass({
          values: { classId: session.class.id },
          constraints: { limit, offset: (page - 1) * limit },
        });

        const { enrollments } = enrollmentsData;

        if (enrollments.length) {
          //  * get attendance records for enrollments in the class session
          const enrollmentIds = enrollments.map((e) => e.id);

          recordsAndSummary = await this.queryRecordsAndSummary({
            ...args,
            values: { classSessionId, enrollmentIds },
            constraints: { limit, offset: (page - 1) * limit },
          });
        }
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_SYSTEM_ERROR",
            message:
              "Failed retrieving class attendance records for professor.",
            err,
          }),
        );
      }

      try {
        return ResultBuilder.success(
          this.toClassAttendanceProfessorViewDto(
            session,
            enrollmentsData,
            recordsAndSummary,
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

      let enrollment;
      let recordsAndSummary: Awaited<
        ReturnType<typeof this.queryRecordsAndSummary>
      > = {
        records: [],
        summary: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          totalRecords: 0,
        },
      };

      try {
        enrollment = await this.queryEnrollmentForClassAndStudent({
          values: { classId, studentId },
          dbOrTx: args.dbOrTx,
        });

        recordsAndSummary = await this.queryRecordsAndSummary({
          ...args,
          values: {
            classId,
            enrollmentIds: [enrollment.id],
          },
          constraints: { limit, offset: (page - 1) * limit },
        });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_SYSTEM_ERROR",
            message: "Failed retrieving class attendance records for student.",
            err,
          }),
        );
      }

      try {
        const dto = this.toClassAttendanceStudentViewDto(recordsAndSummary);
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
          enrollmentId: number;
          date: Date;
        };
      },
    ) {
      let enrollment;
      let cls;
      let recordsAndSummary: Awaited<
        ReturnType<typeof this.queryRecordsAndSummaryWithSessionAndOffering>
      > = {
        records: [],
        summary: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          totalRecords: 0,
        },
      };

      try {
        enrollment = await this.getEnrollmentWithStudentDetails(args);
        cls = await this.getClassWithCourse(args);
        recordsAndSummary =
          await this.queryRecordsAndSummaryWithSessionAndOffering({
            values: {
              classId: cls.id,
              enrollmentIds: [enrollment.id],
            },
          });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_SYSTEM_ERROR",
            message:
              "Failed retrieving class attendance of student for professor.",
            err,
          }),
        );
      }

      try {
        return ResultBuilder.success(
          this.toStudentAttendanceProfessorViewDto(
            cls,
            enrollment,
            recordsAndSummary,
          ),
        );
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance dto.",
            err,
          }),
        );
      }
    }

    /**
     * @description transforms the data retrieved by `queryClassAttendance` into a dto. Normalizes missing
     * attendance records by setting "absent" as the default value for the "status" field and "N/A" for the others.
     */
    private toClassAttendanceProfessorViewDto(
      session: NonNullable<
        Awaited<
          ReturnType<CoreRepositories.ClassSession["getWithClassAndOffering"]>
        >[number]
      >,
      enrollmentsQuery: Awaited<
        ReturnType<typeof this.queryEnrollmentsForClass>
      >,
      recordsAndSummary: Awaited<
        ReturnType<typeof this.queryRecordsAndSummary>
      >,
    ): Schemas.Dto.ClassAttendance.ProfessorView {
      const { classOffering: offering } = session;
      const { course, ...cls } = session.class;
      const { enrollments, totalEnrollments } = enrollmentsQuery;
      const { records, summary } = recordsAndSummary;

      const attendanceMap = new Map<number, (typeof records)[number]>();

      for (const r of records) attendanceMap.set(r.enrollmentId, r);

      return {
        attendanceRecords: enrollments.map((e) => {
          const { student } = e;

          const enrollmentAttendance = attendanceMap.get(e.id);

          const status =
            enrollmentAttendance?.status ?? Data.attendanceStatus.absent;
          const date = enrollmentAttendance?.datePh ?? "N/A";
          const time = enrollmentAttendance?.recordedAt
            ? TimeUtil.toPhTime(new Date(enrollmentAttendance.recordedAt))
            : "N/A";

          return {
            enrollment: {
              id: e.id,
              status: e.status,
              student: {
                ...student,
                department: student.department ?? "No department.",
              },
            },
            record: {
              id: enrollmentAttendance?.id ?? 0,
              status,
              date,
              time,
            },
          };
        }),
        class: {
          id: cls.id,
          classNumber: cls.classNumber,
          course,
          offering: {
            id: offering.id,
            weekDay: offering.weekDay,
            room: offering.rooms?.name ?? "N/A",
            startTimeText: offering.startTimeText,
            endTimeText: offering.endTimeText,
            startTime: offering.startTime,
            endTime: offering.endTime,
          },
        },
        summary: {
          ...summary,
          missingRecords: totalEnrollments - summary.totalRecords,
        },
      };
    }

    private toClassAttendanceStudentViewDto(
      recordsAndSummary: Awaited<
        ReturnType<typeof this.queryRecordsAndSummary>
      >,
    ) {
      const { records, summary } = recordsAndSummary;

      const dto = {
        attendanceRecords: records.map((ar) => {
          return {
            id: ar.id,
            status: ar.status,
            date: ar.datePh,
            time: TimeUtil.toPhTime(new Date(ar.recordedAt)),
          };
        }),
        summary: {
          ...summary,
          missingRecords: 0, // ! temporary until class session tracking is implemented
        },
      };

      return Schemas.Dto.ClassAttendance.studentView.parse(dto);
    }

    private toStudentAttendanceProfessorViewDto(
      cls: Awaited<
        ReturnType<CoreRepositories.Class["queryWithCourse"]>
      >[number],
      enrollment: Awaited<
        ReturnType<CoreRepositories.Enrollment["queryWithStudentDetails"]>
      >[number],
      recordsAndSummary: Awaited<
        ReturnType<typeof this.queryRecordsAndSummaryWithSessionAndOffering>
      >,
    ): Schemas.Dto.StudentAttendance.ProfessorView {
      const { student } = enrollment;
      const { course } = cls;
      const { records, summary } = recordsAndSummary;

      return {
        class: {
          id: cls.id,
          classNumber: cls.classNumber,
          course: { code: course.code, name: course.name },
        },
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
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
        },
        attendanceRecords: records.map((ar) => {
          const { classSession: cs } = ar;
          const { classOffering: co } = cs;

          return {
            classOffering: {
              id: co.id,
              weekDay: co.weekDay,
              room: co.rooms?.name ?? "N/A",
              startTimeText: co.startTimeText,
              endTimeText: co.endTimeText,
              startTime: co.startTime,
              endTime: co.endTime,
            },
            record: {
              id: ar.id,
              status: ar.status,
              date: ar.datePh,
              time: TimeUtil.toPhTime(new Date(ar.recordedAt)),
            },
          };
        }),
        summary: { ...summary, missingRecords: 0 }, //  todo: update this to have logic for trackign misssing records
      };
    }

    private async getSessionDetails(args: {
      values: { classSessionId: number; professorId: number };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classSessionId, professorId } = args.values;

      let session;

      //  * get session info w/ class and offering details
      try {
        session = await this._classSessionRepo
          .getWithClassAndOffering({
            where: (cs, { eq }) => eq(cs.id, classSessionId),
            constraints: { limit: 1 },
            dbOrTx: args.dbOrTx,
          })
          .then((result) => result[0]);
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_offerings` table.",
          err,
        });
      }

      if (!session)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
          message:
            "Provided class has no ongoing session at the provided date.",
        });

      if (session.class.professorId !== professorId)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
          message:
            "This professor does not have a class associated with this class_id.",
        });

      return session;
    }

    private async queryEnrollmentsForClass(args: {
      values: { classId: number };
      constraints?: BaseRepositoryType.QueryConstraints;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { enrollments: e, users: u } = Schema;
      const { eq } = RepositoryUtil.filters;
      const { asc } = RepositoryUtil.orderOperators;

      const where = eq(e.classId, args.values.classId);

      let enrollments;

      try {
        enrollments = await this._enrollmentRepo.selectStudentsFromEnrollments({
          constraints: args.constraints,
          where,
          orderBy: [
            asc(u.surname),
            asc(u.firstName),
            asc(u.middleName),
            asc(u.id),
          ],
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retrieving enrollments for class.",
          err,
        });
      }

      let totalEnrollments;

      try {
        totalEnrollments = await this._enrollmentRepo.countEnrollments({
          where,
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed counting enrollments for class.",
          err,
        });
      }

      return { enrollments: [...enrollments], totalEnrollments };
    }

    private async queryEnrollmentForClassAndStudent(args: {
      values: {
        classId: number;
        studentId: number;
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, studentId } = args.values;

      let enrollment;

      try {
        enrollment = await this._enrollmentRepo.execQuery({
          dbOrTx: args.dbOrTx,
          fn: async (query) =>
            query.findFirst({
              where: (e, { and, eq }) =>
                and(eq(e.studentId, studentId), eq(e.classId, classId)),
            }),
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `enrollments` table.",
          err,
        });
      }

      if (!enrollment)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR",
          message: "This student is not enrolled in this class.",
        });

      return enrollment;
    }

    private async getEnrollmentWithStudentDetails(args: {
      values: { enrollmentId: number };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      let enrollment;

      try {
        enrollment = await this._enrollmentRepo
          .queryWithStudentDetails({
            where: (e, { eq }) => eq(e.id, values.enrollmentId),
            constraints: { limit: 1 },
            dbOrTx,
          })
          .then((r) => r[0]);
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `enrollments` table.",
          err,
        });
      }

      if (!enrollment)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR",
          message: "The specified enrollment was not found.",
        });

      return enrollment;
    }

    private async getClassWithCourse(args: {
      values: { classId: number };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      let cls;

      try {
        cls = await this._classRepo
          .queryWithCourse({
            where: (c, { eq }) => eq(c.id, values.classId),
            orderBy: (c, { asc }) => asc(c.id), //  ! should be user input eventually
            dbOrTx,
          })
          .then((result) => result[0]);
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `classes` table",
          err,
        });
      }

      if (!cls)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
          message: "The specified class was not found.",
        });

      return cls;
    }

    /**
     * @description Queries attendance records matching a class id, time range, and
     * a set of student ids
     */
    private async queryRecordsAndSummary(args: {
      values: {
        classId?: number;
        classSessionId?: number;
        enrollmentIds: number[];
      };
      constraints?: BaseRepositoryType.QueryConstraints;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, classSessionId, enrollmentIds } = args.values;

      if (!enrollmentIds.length)
        return {
          records: [],
          summary: {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            totalRecords: 0,
          },
        };

      const { attendanceRecords: ar } = Schema;
      const { and, eq, inArray } = RepositoryUtil.filters;

      const conditions: (SQLWrapper | undefined)[] = [
        inArray(ar.enrollmentId, enrollmentIds),
      ];

      if (classId) conditions.push(eq(ar.classId, classId));
      if (classSessionId)
        conditions.push(eq(ar.classSessionId, classSessionId));

      const where = and(...conditions.filter(Boolean));

      let records;

      try {
        records = await this._attendanceRecordRepo.queryMinimalShape({
          constraints: args.constraints,
          where,
          orderBy: (ar, { desc }) => desc(ar.recordedMs),
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retreiving attendance records.",
          err,
        });
      }

      let summary;

      try {
        summary = await this._attendanceRecordRepo.selectSummary({
          where: and(...conditions.filter(Boolean)),
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retrieving attendance summary.",
          err,
        });
      }

      return { records, summary };
    }

    private async queryRecordsAndSummaryWithSessionAndOffering(args: {
      values: {
        classId?: number;
        classSessionId?: number;
        enrollmentIds: number[];
      };
      constraints?: BaseRepositoryType.QueryConstraints;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, classSessionId, enrollmentIds } = args.values;

      if (!enrollmentIds.length)
        return {
          records: [],
          summary: {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            totalRecords: 0,
          },
        };

      const { attendanceRecords: ar } = Schema;
      const { and, eq, inArray } = RepositoryUtil.filters;

      const conditions: (SQLWrapper | undefined)[] = [
        inArray(ar.enrollmentId, enrollmentIds),
      ];

      if (classId) conditions.push(eq(ar.classId, classId));
      if (classSessionId)
        conditions.push(eq(ar.classSessionId, classSessionId));

      const where = and(...conditions.filter(Boolean));

      let records;

      try {
        records =
          await this._attendanceRecordRepo.queryMinimalShapeWithSessionAndOffering(
            {
              constraints: args.constraints,
              where,
              orderBy: (ar, { desc }) => desc(ar.recordedMs),
            },
          );
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retreiving attendance records.",
          err,
        });
      }

      let summary;

      try {
        summary = await this._attendanceRecordRepo.selectSummary({
          where: and(...conditions.filter(Boolean)),
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retrieving attendance summary.",
          err,
        });
      }

      return { records, summary };
    }
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    dbOrTx?: DbOrTx | undefined;
  };
}
