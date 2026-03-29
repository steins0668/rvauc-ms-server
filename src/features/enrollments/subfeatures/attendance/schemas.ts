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
  }

  export namespace RequestQuery {
    export const attendanceRecord = z
      .strictObject({
        date: z.iso.datetime().default(Clock.now().toISOString()),
        scope: z.enum(Data.AttendanceQuery.scope),
      })
      .strip();

    export type AttendanceRecord = z.infer<typeof attendanceRecord>;
  }

  export namespace RequestParams {
    export const classId = z
      .strictObject({ classId: z.coerce.number() })
      .strip();

    export type ClassId = z.infer<typeof classId>;
  }

  export namespace Dto {
    export const studentAttendance = z
      .strictObject({
        id: z.number(),
        status: z.enum(Data.attendanceStatus),
        date: z.string(),
        time: z.string(),
      })
      .strip();

    export const registeredAttendance = z
      .strictObject({
        ...studentAttendance.shape,
        isNew: z.boolean(),
      })
      .strip();

    export const studentAttendanceDetailed = z
      .strictObject({
        attendance: studentAttendance,
        student: z
          .strictObject({
            //  * student data
            studentNumber: z.string(),
            yearLevel: z.number(),
            block: z.string(),
            //  * user data
            surname: z.string(),
            firstName: z.string(),
            middleName: z.string(),
            gender: z.string(),
          })
          .strip(),
      })
      .strip();

    export const classAttendanceRecord = z
      .strictObject({
        attendanceRecord: z.array(studentAttendanceDetailed),
        scheduledClass: Core.Schemas.Dto.scheduledClass,
      })
      .strip();

    export type StudentAttendance = z.infer<typeof studentAttendance>;
    export type RegisteredAttendance = z.infer<typeof registeredAttendance>;
    export type StudentAttendanceDetailed = z.infer<
      typeof studentAttendanceDetailed
    >;
    export type ClassAttendanceRecord = z.infer<typeof classAttendanceRecord>;
  }

  export namespace MethodArgs {
    export namespace AttendanceQuery {
      export const studentClass = z
        .strictObject({
          roleScope: z.literal(Data.AttendanceQuery.roleScope.studentClass),
          role: z.literal(Auth.Core.Data.Records.roles.student),
          scope: z.literal(Data.AttendanceQuery.scope.class),
          values: z
            .strictObject({
              termId: z.number(),
              classId: z.number(),
              studentId: z.number(),
              date: z.date(),
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
              termId: z.number(),
              classId: z.number(),
              professorId: z.number(),
              date: z.date(),
            })
            .strip(),
        })
        .strip();

      export const professorVariants = [professorClass] as const;

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
      export type ProfessorAttendanceQuery = z.infer<
        typeof professorAttendanceQuery
      >;
      export type All = z.infer<typeof all>;
    }
  }
}
