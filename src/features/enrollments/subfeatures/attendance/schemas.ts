import z from "zod";
import { Clock } from "../../../../utils";
import { Data } from "./data";
import { Core } from "../../core";
import { Auth } from "../../../auth";

export namespace Schemas {
  export namespace RequestBody {
    export const newRecord = z
      .strictObject({
        date: z.coerce.date(),
        room: z.string(),
      })
      .strip();

    export type NewRecord = z.infer<typeof newRecord>;

    export const recordSubmission = z
      .strictObject({
        date: z.coerce.date(),
        records: z.array(
          z
            .strictObject({
              studentId: z.number(),
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
        date: z.iso.datetime().default(Clock.now().toISOString()),
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

    export const studentId = z
      .strictObject({ studentId: z.coerce.number() })
      .strip();

    export type ClassId = z.infer<typeof classId>;
    export type ClassOfferingId = z.infer<typeof classOfferingId>;
    export type StudentId = z.infer<typeof studentId>;
  }

  export namespace Dto {
    export const base = z
      .strictObject({
        id: z.number(),
        status: z.enum(Data.attendanceStatus),
        date: z.string(),
        time: z.string(),
      })
      .strip();
    export type Base = z.infer<typeof base>;

    export const registeredAttendance = z
      .strictObject({
        ...base.shape,
        isNew: z.boolean(),
      })
      .strip();
    export type RegisteredAttendance = z.infer<typeof registeredAttendance>;

    export const summary = z
      .strictObject({
        present: z.number(),
        absent: z.number(),
        late: z.number(),
        excused: z.number(),
      })
      .strip();

    export namespace ClassAttendance {
      export const studentView = z
        .strictObject({ attendanceRecords: z.array(base), summary: summary })
        .strip();
      export type StudentView = z.infer<typeof studentView>;

      export const professorView = z
        .strictObject({
          attendanceRecords: z.array(
            z
              .strictObject({
                record: base,
                student: Core.Schemas.Dto.student,
              })
              .strip(),
          ),
          class: Core.Schemas.Dto.scheduledClass,
          summary: summary,
        })
        .strip();
      export type ProfessorView = z.infer<typeof professorView>;
    }

    export namespace StudentAttendance {
      export const attendanceRecords = z.array(
        z
          .strictObject({
            classOffering: Core.Schemas.Dto.classOffering,
            record: base,
          })
          .strip(),
      );

      export const professorView = z
        .strictObject({
          class: z
            .strictObject({
              ...Core.Schemas.Dto.class_.shape,
              course: Core.Schemas.Dto.course,
            })
            .strip(),
          student: Core.Schemas.Dto.student,
          attendanceRecords,
          summary: summary,
        })
        .strip();

      export type AttendanceRecords = z.infer<typeof attendanceRecords>;
      export type ProfessorView = z.infer<typeof professorView>;
    }
  }

  export namespace MethodArgs {
    export namespace AttendanceQuery {
      export const roleScopes = z.enum(Data.AttendanceQuery.roleScope);
      export type RoleScopes = z.infer<typeof roleScopes>;

      const defaultValues = z.object({ termId: z.number(), date: z.date() });

      export const studentClass = z
        .strictObject({
          roleScope: z.literal(Data.AttendanceQuery.roleScope.studentClass),
          role: z.literal(Auth.Core.Data.Records.roles.student),
          scope: z.literal(Data.AttendanceQuery.scope.class),
          values: z
            .strictObject({
              ...defaultValues.shape,
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
              ...defaultValues.shape,
              classId: z.number(),
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
              ...defaultValues.shape,
              classId: z.number(),
              professorId: z.number(),
              studentId: z.number(),
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
