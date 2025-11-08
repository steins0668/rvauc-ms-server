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
      reason: z.enum(Data.Enums.ViolationReason, {
        error: (iss) =>
          iss.input === undefined ? "Reason is required." : "Invalid reason.",
      }),
      reasons: z.array(z.enum(Data.Enums.ViolationReason)),
    });
  }
}
