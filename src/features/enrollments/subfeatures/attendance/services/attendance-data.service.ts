import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { DtoMappers } from "../dto-mappers";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { AttendanceQuery } from "./attendance-query.service";

export namespace AttendanceData {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    return new Service({
      attendanceQueryService: new AttendanceQuery.Service({
        attendanceRecordRepo,
      }),
      classQueryService: new Core.Services.ClassQuery.Service({
        classRepo,
      }),
      classSessionQueryService: new Core.Services.ClassSessionQuery.Service({
        classSessionRepo,
      }),
      enrollmentQueryService: new Core.Services.EnrollmentQuery.Service({
        enrollmentRepo,
      }),
    });
  }

  export class Service {
    private readonly _attendanceQuery: AttendanceQuery.Service;
    private readonly _classQuery: Core.Services.ClassQuery.Service;
    private readonly _classSessionQuery: Core.Services.ClassSessionQuery.Service;
    private readonly _enrollmentQuery: Core.Services.EnrollmentQuery.Service;
    private readonly EMPTY_ATTENDANCE_RESULT = {
      records: [],
      summary: {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        totalRecords: 0,
      },
    };

    constructor(args: {
      attendanceQueryService: AttendanceQuery.Service;
      classQueryService: Core.Services.ClassQuery.Service;
      classSessionQueryService: Core.Services.ClassSessionQuery.Service;
      enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
    }) {
      this._attendanceQuery = args.attendanceQueryService;
      this._classQuery = args.classQueryService;
      this._classSessionQuery = args.classSessionQueryService;
      this._enrollmentQuery = args.enrollmentQueryService;
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

      let session;
      let classEnrollments;
      let recordsAndSummary: Awaited<
        ReturnType<AttendanceQuery.Service["fetchRecordsAndSummary"]>
      > = this.EMPTY_ATTENDANCE_RESULT;

      try {
        const constraints = {
          limit: RepositoryUtil.resolveLimit(args.constraints),
          offset: RepositoryUtil.resolveOffsetFromPage(args.constraints),
        };

        session = await this.ensureSessionForProfessor(args);

        const { enrollments: e, users: u } = Schema;
        const { eq } = RepositoryUtil.filters;
        const { asc } = RepositoryUtil.orderOperators;

        classEnrollments =
          await this._enrollmentQuery.getEnrollmentsWithStudentDetails({
            constraints,
            where: eq(e.classId, session.class.id),
            orderBy: [
              asc(u.surname),
              asc(u.firstName),
              asc(u.middleName),
              asc(u.id),
            ],
            dbOrTx: args.dbOrTx,
          });

        const { enrollments } = classEnrollments;

        if (enrollments.length) {
          //  * get attendance records for enrollments in the class session
          const enrollmentIds = enrollments.map((e) => e.id);

          recordsAndSummary =
            await this._attendanceQuery.fetchRecordsAndSummary({
              values: { classSessionId, enrollmentIds },
              constraints,
              dbOrTx: args.dbOrTx,
            });
        }
      } catch (err) {
        const internalError = Core.Errors.EnrollmentData.internalError(
          "Failed retrieving class attendance records for professor.",
        );

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_QUERY_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        return ResultBuilder.success(
          DtoMappers.Query.classAttendanceProfessorView(
            session,
            classEnrollments,
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
      const { classId } = args.values;

      let enrollment;
      let recordsAndSummary: Awaited<
        ReturnType<AttendanceQuery.Service["fetchRecordsAndSummary"]>
      > = this.EMPTY_ATTENDANCE_RESULT;

      try {
        enrollment = await this._enrollmentQuery.ensureForClassAndStudent(args);

        recordsAndSummary = await this._attendanceQuery.fetchRecordsAndSummary({
          values: {
            classId,
            enrollmentIds: [enrollment.id],
          },
          constraints: {
            limit: RepositoryUtil.resolveLimit(args.constraints),
            offset: RepositoryUtil.resolveOffsetFromPage(args.constraints),
          },
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        const internalError = Core.Errors.EnrollmentData.internalError(
          "Failed retrieving class attendance records for student.",
        );

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_STUDENT_NOT_FOUND_ERROR":
                case "ENROLLMENT_DATA_STUDENT_NOT_ENROLLED_ERROR":
                  return create({
                    name: "ENROLLMENT_DATA_CLASS_FORBIDDEN_ERROR",
                    message: "This student does not have access to this class.",
                    cause: err,
                  });
                case "ENROLLMENT_DATA_QUERY_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        const dto =
          DtoMappers.Query.classAttendanceStudentView(recordsAndSummary);
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
          classId: number;
          enrollmentId: number;
          professorId: number;
        };
      },
    ) {
      let enrollment;
      let cls;
      let recordsAndSummary: Awaited<
        ReturnType<
          AttendanceQuery.Service["fetchRecordsAndSummaryWithSessionAndOffering"]
        >
      > = this.EMPTY_ATTENDANCE_RESULT;

      try {
        cls = await this.ensureClassForProfessor(args);

        enrollment = await this.ensureEnrollmentForClass(args);

        recordsAndSummary =
          await this._attendanceQuery.fetchRecordsAndSummaryWithSessionAndOffering(
            {
              values: {
                classId: cls.id,
                enrollmentIds: [enrollment.id],
              },
              dbOrTx: args.dbOrTx,
            },
          );
      } catch (err) {
        const internalError = Core.Errors.EnrollmentData.internalError(
          "Failed retrieving class attendance of student for professor.",
        );

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_QUERY_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        return ResultBuilder.success(
          DtoMappers.Query.studentAttendanceProfessorView(
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

    private async ensureSessionForProfessor(args: {
      values: { classSessionId: number; professorId: number };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classSessionId, professorId } = args.values;

      let session = await this._classSessionQuery.ensureWithClassContext({
        where: (cs, { eq }) => eq(cs.id, classSessionId),
        dbOrTx: args.dbOrTx,
      });

      if (session.class.professorId !== professorId)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_SESSION_FORBIDDEN_ERROR",
          message:
            "This professor is not associated with the specified class session.",
        });

      return session;
    }

    private async ensureClassForProfessor(args: {
      values: {
        classId: number;
        professorId: number;
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const cls = await this._classQuery.ensureClassWithCourse({
        where: (c, { eq }) => eq(c.id, args.values.classId),
        dbOrTx: args.dbOrTx,
      });

      if (cls.professorId !== args.values.professorId)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_FORBIDDEN_ERROR",
          message: "This professor is not associated with the specified class.",
        });

      return cls;
    }

    private async ensureEnrollmentForClass(args: {
      values: { classId: number; enrollmentId: number };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const enrollment =
        await this._enrollmentQuery.ensureEnrollmentsWithStudentGraph({
          where: (e, { eq }) => eq(e.id, args.values.enrollmentId),
          dbOrTx: args.dbOrTx,
        });

      if (enrollment.classId !== args.values.classId)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR",
          message: "The specified enrollment was not found.",
        });

      return enrollment;
    }
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    dbOrTx?: DbOrTx | undefined;
  };
}
