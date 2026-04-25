import z from "zod";
import { Clock } from "../../../../utils";
import { Data } from "./data";
import { Core } from "../../core";
import { Auth } from "../../../auth";

export namespace Schemas {
  export namespace RequestBody {
    export const newRecord = z
      .strictObject({
        date: z.coerce.date().default(Clock.now()),
        room: z.string(),
      })
      .strip();

    export type NewRecord = z.infer<typeof newRecord>;

    export const recordSubmission = z
      .strictObject({
        records: z.array(
          z
            .strictObject({
              recordedDate: z.coerce.date(),
              enrollmentId: z.number(),
              status: z.enum(Data.attendanceStatus),
            })
            .strip(),
        ),
      })
      .strip();

    export type RecordSubmission = z.infer<typeof recordSubmission>;
  }

  export namespace RequestQuery {
    export const attendanceRecord = z
      .strictObject({
        timeMs: z.coerce.number().default(Clock.now().getTime()),
        limit: z.coerce.number().min(1).max(50).default(6),
        page: z.coerce.number().min(1).default(1),
      })
      .strip();

    export type AttendanceRecord = z.infer<typeof attendanceRecord>;
  }

  export namespace RequestParams {
    export const classId = z
      .strictObject({ classId: z.coerce.number() })
      .strip();

    export const classOfferingId = z
      .strictObject({ classOfferingId: z.coerce.number() })
      .strip();

    export const classSessionId = z
      .strictObject({ classSessionId: z.coerce.number() })
      .strip();

    export const enrollmentId = z
      .strictObject({ enrollmentId: z.coerce.number() })
      .strip();

    export const studentId = z
      .strictObject({ studentId: z.coerce.number() })
      .strip();

    export type ClassId = z.infer<typeof classId>;
    export type ClassOfferingId = z.infer<typeof classOfferingId>;
    export type ClassSessionId = z.infer<typeof classSessionId>;
    export type EnrollmentId = z.infer<typeof enrollmentId>;
    export type StudentId = z.infer<typeof studentId>;
  }

  export namespace Dto {
    export const base = z
      .strictObject({
        id: z.number(),
        status: z.string(),
        time: z.string(),
      })
      .strip();
    export type Base = z.infer<typeof base>;

    export const insertedAttendance = z
      .strictObject({
        ...base.shape,
        isNew: z.boolean(),
      })
      .strip();
    export type InsertedAttendance = z.infer<typeof insertedAttendance>;

    export const summaryBase = z
      .strictObject({
        present: z.number(),
        absent: z.number(),
        late: z.number(),
        excused: z.number(),
        totalRecords: z.number(),
        missingRecords: z.number(),
      })
      .strip();

    export namespace ClassAttendance {
      export const studentView = z
        .strictObject({
          history: z.array(
            z
              .strictObject({
                record: z.strictObject({
                  ...base.shape,
                  id: z.number().nullable(),
                }),
                offering: z
                  .strictObject({
                    weekDay: z.string(),
                    startTime: z.string(),
                    endTime: z.string(),
                  })
                  .strip(),
                session: z
                  .strictObject({
                    id: z.number(),
                    status: z.string(),
                    date: z.string(),
                  })
                  .strip(),
              })
              .strip(),
          ),
          summary: z
            .strictObject({
              ...summaryBase.shape,
              totalSessions: z.number(),
            })
            .strip(),
        })
        .strip();
      export type StudentView = z.infer<typeof studentView>;

      export const professorView = z
        .strictObject({
          attendanceRecords: z.array(
            z
              .strictObject({
                record: z.strictObject({
                  ...base.shape,
                  id: z.number().nullable(),
                }),
                enrollment: z
                  .strictObject({
                    id: z.number(),
                    status: z.string(),
                  })
                  .strip(),
                student: z
                  .strictObject({
                    id: z.number(),
                    studentNumber: z.string(),
                    surname: z.string(),
                    firstName: z.string(),
                    middleName: z.string(),
                  })
                  .strip(),
              })
              .strip(),
          ),
          offering: z
            .strictObject({
              id: z.number(),
              weekDay: z.string(),
              startTime: z.string(),
              endTime: z.string(),
            })
            .strip(),
          session: z
            .strictObject({
              id: z.number(),
              status: z.string(),
              date: z.string(),
            })
            .strip(),
          summary: z
            .strictObject({
              ...summaryBase.shape,
              totalEnrollments: z.number(),
            })
            .strip(),
        })
        .strip();
      export type ProfessorView = z.infer<typeof professorView>;

      //#region
      //  ! `AttendanceRegistration` service helpers ONLY
      export const normalizedRecord = z
        .strictObject({
          enrollmentId: z.number(),
          status: z.enum(Data.attendanceStatus),
          recordedAt: z.string(),
          recordedMs: z.number(),
        })
        .strip();
      export const normalizedRecords = z.array(normalizedRecord);
      export const rejectedRecord = z
        .strictObject({
          record: normalizedRecord,
          reasons: z.array(
            z.enum(["OUT_OF_SESSION_DATE", "OUT_OF_SCHEDULE", "NOT_ENROLLED"]),
          ),
        })
        .strip();
      export const rejectedRecords = z.array(rejectedRecord);

      export type NormalizedRecord = z.infer<typeof normalizedRecord>;
      export type NormalizedRecords = z.infer<typeof normalizedRecords>;
      export type RejectedRecord = z.infer<typeof rejectedRecord>;
      export type RejectedRecords = z.infer<typeof rejectedRecords>;

      export const mutationResult = z
        .strictObject({
          updated: z.array(base),
          inserted: z.array(insertedAttendance),
          rejected: rejectedRecords,
        })
        .strip();
      export type MutationResult = z.infer<typeof mutationResult>;

      export const sessionAttendanceResult = z
        .strictObject({
          ...Core.Schemas.Dto.runtimeStudentView.shape,
          room: z
            .strictObject({
              name: z.string(),
              building: z.string().nullable(),
            })
            .strip(),
          attendance: insertedAttendance,
        })
        .strip();

      export type SessionAttendanceResult = z.infer<
        typeof sessionAttendanceResult
      >;
      //#endregion
    }

    export namespace StudentAttendance {
      export const history = z.array(
        z
          .strictObject({
            record: z.strictObject({
              ...base.shape,
              id: z.number().nullable(),
            }),
            offering: z
              .strictObject({
                id: z.number(),
                weekDay: z.string(),
                startTime: z.string(),
                endTime: z.string(),
              })
              .strip(),
            session: z
              .strictObject({
                id: z.number(),
                status: z.string(),
                date: z.string(),
              })
              .strip(),
          })
          .strip(),
      );

      export const professorView = z
        .strictObject({
          enrollment: z
            .strictObject({ id: z.number(), status: z.string() })
            .strip(),
          student: z.strictObject({
            id: z.number(),
            studentNumber: z.string(),
            surname: z.string(),
            firstName: z.string(),
            middleName: z.string(),
          }),
          history: history,
          summary: z
            .strictObject({
              ...summaryBase.shape,
              totalSessions: z.number(),
            })
            .strip(),
        })
        .strip();

      export type ProfessorView = z.infer<typeof professorView>;
    }
  }

  export namespace MethodArgs {
    export namespace AttendanceQuery {
      export const roleScopes = z.enum(Data.AttendanceQuery.roleScope);
      export type RoleScopes = z.infer<typeof roleScopes>;

      export const studentClass = z
        .strictObject({
          roleScope: z.literal(Data.AttendanceQuery.roleScope.studentClass),
          role: z.literal(Auth.Core.Data.Records.roles.student),
          scope: z.literal(Data.AttendanceQuery.scope.class),
          values: z
            .strictObject({
              classId: z.number(),
              studentId: z.number(),
            })
            .strip(),
        })
        .strip();

      export const studentVariants = [studentClass] as const;

      export const studentAttendanceQuery = z.discriminatedUnion(
        "roleScope",
        studentVariants,
      );

      export const professorClass = z
        .strictObject({
          roleScope: z.literal(Data.AttendanceQuery.roleScope.professorClass),
          role: z.literal(Auth.Core.Data.Records.roles.professor),
          scope: z.literal(Data.AttendanceQuery.scope.class),
          values: z
            .strictObject({
              classSessionId: z.number(),
              professorId: z.number(),
            })
            .strip(),
        })
        .strip();

      export const professorStudent = z
        .strictObject({
          roleScope: z.literal(Data.AttendanceQuery.roleScope.professorStudent),
          role: z.literal(Auth.Core.Data.Records.roles.professor),
          scope: z.literal(Data.AttendanceQuery.scope.student),
          values: z
            .strictObject({
              professorId: z.number(),
              enrollmentId: z.number(),
            })
            .strip(),
        })
        .strip();

      export const professorVariants = [
        professorClass,
        professorStudent,
      ] as const;

      export const professorAttendanceQuery = z.discriminatedUnion(
        "roleScope",
        professorVariants,
      );

      export const all = z.discriminatedUnion("roleScope", [
        ...studentVariants,
        ...professorVariants,
      ]);

      export type StudentClass = z.infer<typeof studentClass>;
      export type StudentAttendanceQuery = z.infer<
        typeof studentAttendanceQuery
      >;
      export type ProfessorClass = z.infer<typeof professorClass>;
      export type ProfessorStudent = z.infer<typeof professorStudent>;
      export type ProfessorAttendanceQuery = z.infer<
        typeof professorAttendanceQuery
      >;
      export type All = z.infer<typeof all>;
    }
  }
}
