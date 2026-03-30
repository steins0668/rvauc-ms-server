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
      })
      .strip();

    export type AttendanceRecord = z.infer<typeof attendanceRecord>;
  }

  export namespace RequestParams {
    export const classId = z
      .strictObject({ classId: z.coerce.number() })
      .strip();

    export const studentId = z
      .strictObject({ studentId: z.coerce.number() })
      .strip();

    export type ClassId = z.infer<typeof classId>;
    export type StudentId = z.infer<typeof studentId>;
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

    export const studentAttendanceRecord = z.array(
      z
        .strictObject({
          classOfferingDetails: Core.Schemas.Dto.classOfferingDetails,
          attendance: studentAttendance,
        })
        .strip(),
    );

    //  todo: reference only, to be removed
    export const studentClassRecord = z
      .strictObject({
        classDetails: Core.Schemas.Dto.ClassDetails.withProfessor,
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
        attendanceRecord: z.array(
          z
            .strictObject({
              classOfferingDetails: Core.Schemas.Dto.classOfferingDetails,
              attendance: studentAttendance,
            })
            .strip(),
        ),
      })
      .strip();

    export type StudentAttendance = z.infer<typeof studentAttendance>;
    export type RegisteredAttendance = z.infer<typeof registeredAttendance>;
    export type StudentAttendanceDetailed = z.infer<
      typeof studentAttendanceDetailed
    >;
    export type ClassAttendanceRecord = z.infer<typeof classAttendanceRecord>;
    export type StudentAttendanceRecord = z.infer<
      typeof studentAttendanceRecord
    >;
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
