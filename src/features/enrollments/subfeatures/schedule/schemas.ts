import z from "zod";
import { Clock } from "../../../../utils";

export namespace Schemas {
  export namespace RequestQuery {
    export const userSchedule = z
      .strictObject({
        date: z.iso.datetime().default(Clock.now().toISOString()),
      })
      .strip();

    export type UserSchedule = z.infer<typeof userSchedule>;
  }
}
