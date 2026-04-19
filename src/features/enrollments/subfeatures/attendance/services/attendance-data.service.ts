import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { AttendanceDto } from "./attendance-dto.mapper";
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
    private readonly _attendanceQueryService: AttendanceQuery.Service;
    private readonly _classQueryService: Core.Services.ClassQuery.Service;
    private readonly _classSessionQueryService: Core.Services.ClassSessionQuery.Service;
    private readonly _enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
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
      this._attendanceQueryService = args.attendanceQueryService;
      this._classQueryService = args.classQueryService;
      this._classSessionQueryService = args.classSessionQueryService;
      this._enrollmentQueryService = args.enrollmentQueryService;
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
          offset: RepositoryUtil.resolveOffset(args.constraints),
        };

        session = await this.ensureSessionForProfessor(args);

        const { enrollments: e, users: u } = Schema;
        const { eq } = RepositoryUtil.filters;
        const { asc } = RepositoryUtil.orderOperators;

        classEnrollments =
          await this._enrollmentQueryService.getEnrollmentsWithStudentDetails({
            constraints: args.constraints,
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
            await this._attendanceQueryService.fetchRecordsAndSummary({
              ...args,
              values: { classSessionId, enrollmentIds },
              constraints,
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
          AttendanceDto.Mapper.toClassAttendanceProfessorViewDto(
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
      const { classId, studentId } = args.values;

      let enrollment;
      let recordsAndSummary: Awaited<
        ReturnType<AttendanceQuery.Service["fetchRecordsAndSummary"]>
      > = this.EMPTY_ATTENDANCE_RESULT;

      try {
        enrollment =
          await this._enrollmentQueryService.ensureEnrollmentForClassAndStudent(
            {
              values: { classId, studentId },
              dbOrTx: args.dbOrTx,
            },
          );

        recordsAndSummary =
          await this._attendanceQueryService.fetchRecordsAndSummary({
            ...args,
            values: {
              classId,
              enrollmentIds: [enrollment.id],
            },
            constraints: {
              limit: RepositoryUtil.resolveLimit(args.constraints),
              offset: RepositoryUtil.resolveOffset(args.constraints),
            },
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
        const dto =
          AttendanceDto.Mapper.toClassAttendanceStudentViewDto(
            recordsAndSummary,
          );
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
        ReturnType<
          AttendanceQuery.Service["fetchRecordsAndSummaryWithSessionAndOffering"]
        >
      > = this.EMPTY_ATTENDANCE_RESULT;

      try {
        enrollment =
          await this._enrollmentQueryService.ensureEnrollmentsWithStudentGraph({
            where: (e, { eq }) => eq(e.id, args.values.enrollmentId),
            dbOrTx: args.dbOrTx,
          });
        cls = await this._classQueryService.ensureClassWithCourse({
          where: (c, { eq }) => eq(c.id, args.values.classId),
          orderBy: (c, { asc }) => asc(c.id), //  ! should be user input eventually
          dbOrTx: args.dbOrTx,
        });
        recordsAndSummary =
          await this._attendanceQueryService.fetchRecordsAndSummaryWithSessionAndOffering(
            {
              values: {
                classId: cls.id,
                enrollmentIds: [enrollment.id],
              },
            },
          );
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
          AttendanceDto.Mapper.toStudentAttendanceProfessorViewDto(
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

      let session = await this._classSessionQueryService.ensureWithClassContext(
        {
          where: (cs, { eq }) => eq(cs.id, classSessionId),
          dbOrTx: args.dbOrTx,
        },
      );

      if (session.class.professorId !== professorId)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
          message:
            "This professor is not associated with the specified class or class session.",
        });

      return session;
    }
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    dbOrTx?: DbOrTx | undefined;
  };
}
