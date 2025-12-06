import z from "zod";
import { Clock } from "../../../../utils";

export namespace Schemas {
  export namespace RequestQuery {
    export const studentSchedule = z
      .strictObject({
        date: z.iso.datetime().default(Clock.now().toISOString()),
      })
      .strip();

    export type StudentSchedule = z.infer<typeof studentSchedule>;
  }
}
