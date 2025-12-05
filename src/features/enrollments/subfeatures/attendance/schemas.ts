import z from "zod";
import { Data } from "./data";

export namespace Schemas {
  export namespace RequestBody {
    export const newRecord = z
      .strictObject({
        date: z.coerce.date(),
      })
      .strip();

    export type NewRecord = z.infer<typeof newRecord>;
  }

  export namespace Dto {
    export const attendance = z
      .strictObject({
        id: z.number(),
        status: z.enum(Data.attendanceStatus),
        date: z.string(),
        time: z.string(),
        isNew: z.boolean(),
      })
      .strip();

    export type Attendance = z.infer<typeof attendance>;
  }
}
