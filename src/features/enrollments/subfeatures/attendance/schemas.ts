import z from "zod";
import { Clock } from "../../../../utils";
import { Data } from "./data";
import { Core } from "../../core";

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
}
