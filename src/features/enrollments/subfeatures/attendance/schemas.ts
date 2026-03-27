import z from "zod";
import { Clock } from "../../../../utils";
import { Data } from "./data";

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
    export const attendance = z
      .strictObject({
        id: z.number(),
        status: z.enum(Data.attendanceStatus),
        date: z.string(),
        time: z.string(),
      })
      .strip();

    export const registeredAttendance = z
      .strictObject({
        ...attendance.shape,
        isNew: z.boolean(),
      })
      .strip();

    export type Attendance = z.infer<typeof attendance>;
    export type RegisteredAttendance = z.infer<typeof registeredAttendance>;
  }
}
