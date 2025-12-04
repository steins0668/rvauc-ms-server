import z from "zod";

export namespace Schemas {
  export namespace RequestBody {
    export const newRecord = z.strictObject({
      date: z.coerce.date(),
    });

    export type NewRecord = z.infer<typeof newRecord>;
  }
}
