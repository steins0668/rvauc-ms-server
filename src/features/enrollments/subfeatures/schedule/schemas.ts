import z from "zod";
import { Clock } from "../../../../utils";

export namespace Schemas {
  export namespace RequestQuery {
    export const userSchedule = z
      .strictObject({
        timeMs: z.coerce.number().default(Clock.now(new Date()).getTime()),
      })
      .strip();

    export type UserSchedule = z.infer<typeof userSchedule>;
  }
}
