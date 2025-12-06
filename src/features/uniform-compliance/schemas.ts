import z from "zod";
import { Auth } from "../auth";
import { Data } from "./data";

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
    });

    export type RecordDTO = z.infer<typeof recordDTO>;

    export const recordDTO = z.strictObject({
      id: z.number(),
      date: z.string(),
      day: z.string(),
      time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      status: z.enum(Data.Records.ComplianceStatus),
      studentNumber: z.string().regex(Auth.Core.Data.Regex.Auth.StudentNumber),
      block: z.string(),
      yearLevel: z.number(),
      department: z.string(),
      surname: z.string(),
      firstName: z.string(),
      middleName: z.string(),
    });
  }
}
