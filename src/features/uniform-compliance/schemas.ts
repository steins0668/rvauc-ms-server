import z from "zod";
import { Auth } from "../auth";

export namespace Schemas {
  export namespace ComplianceData {
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
      uniformTypeId: z.number({
        error: (iss) =>
          iss.input === undefined
            ? "Uniform type is required."
            : "Invalid uniform type.",
      }),
      validFootwear: z.boolean(),
      hasId: z.boolean(),
      validUpperwear: z.boolean(),
      validBottoms: z.boolean(),
      termId: z.number(),
    });
  }
}
