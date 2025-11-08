import z from "zod";
import { Auth } from "../auth";
import { Data } from "./data";

export namespace Schemas {
  export namespace ViolationData {
    export type NewRecord = z.infer<typeof newRecord>;

    export const newRecord = z.strictObject({
      studentNumber: z
        .string({
          error: (iss) =>
            iss.input === undefined
              ? "Student number is required."
              : "Invalid student number.",
        })
        .regex(Auth.Core.Data.Regex.Auth.StudentNumber),
      statusId: z.number({
        error: (iss) =>
          iss.input === undefined ? "Status is required." : "Invalid status.",
      }),
      number: z.string({
        error: (iss) =>
          iss.input === undefined ? "Number is required." : "Invalid number.",
      }),
      reasons: z.array(z.enum(Data.Records.ViolationReason)),
    });

    export type RecordDTO = z.infer<typeof recordDTO>;

    export const recordDTO = z.strictObject({
      id: z.number(),
      date: z.string(),
      day: z.string(),
      time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      status: z.string(),
      reasons: z.array(z.enum(Data.Records.ViolationReason)),
    });
  }
}
