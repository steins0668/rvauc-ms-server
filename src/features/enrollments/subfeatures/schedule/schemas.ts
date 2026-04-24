import z from "zod";
import { Clock } from "../../../../utils";
import { Auth } from "../../../auth";
export namespace Schemas {
  export namespace Dto {
    export const classListElementBase = z
      .strictObject({
        class: z
          .strictObject({ id: z.number(), classNumber: z.string() })
          .strip(),
        course: z
          .strictObject({
            id: z.number(),
            name: z.string(),
            code: z.string(),
          })
          .strip(),
        offering: z.nullable(
          z
            .strictObject({
              id: z.number(),
              weekDay: z.string(),
              startTime: z.string(),
              endTime: z.string(),
              room: z.nullable(
                z
                  .strictObject({
                    name: z.string(),
                    building: z.string().nullable(),
                  })
                  .strip(),
              ),
            })
            .strip(),
        ),
      })
      .strip();

    export const classList = z.discriminatedUnion("role", [
      z
        .strictObject({
          role: z.literal(Auth.Core.Data.Records.roles.student),
          classes: z.array(
            z
              .strictObject({
                ...classListElementBase.shape,
                professor: z
                  .strictObject({
                    id: z.number(),
                    surname: z.string(),
                    firstName: z.string(),
                    middleName: z.string(),
                  })
                  .strip(),
              })
              .strip(),
          ),
        })
        .strip(),
      z
        .strictObject({
          role: z.literal(Auth.Core.Data.Records.roles.professor),
          classes: z.array(classListElementBase),
        })
        .strip(),
    ]);

    export type ClassList = z.infer<typeof classList>;
  }
  export namespace RequestQuery {
    export const userSchedule = z
      .strictObject({
        timeMs: z.coerce
          .number()
          .default(Clock.now(new Date("2025-12-03T11:00:00+08:00")).getTime()),
      })
      .strip();

    export type UserSchedule = z.infer<typeof userSchedule>;
  }
}
