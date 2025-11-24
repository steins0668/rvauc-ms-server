import z from "zod";

export namespace Schemas {
  export namespace SignIn {
    export const rfidUidMethod = z.strictObject({
      method: z.literal("rfidUid"),
      identifier: z.string({
        error: (iss) => {
          if (iss.code === "invalid_type")
            return "Student number must be a string";
          if (!iss.input) return "Student number is required.";
        },
      }),
    });

    export const studentNumberMethod = z.strictObject({
      method: z.literal("studentNumber"),
      identifier: z.string({
        error: (iss) => {
          if (iss.code === "invalid_type")
            return "Student number must be a string";
          if (!iss.input) return "Student number is required.";
        },
      }),
    });

    export const methodsSchema = z.discriminatedUnion("method", [
      rfidUidMethod,
      studentNumberMethod,
    ]);

    export type RfidMethod = z.infer<typeof rfidUidMethod>;
    export type StudentNumberMethod = z.infer<typeof studentNumberMethod>;
    export type MethodsSchema = z.infer<typeof methodsSchema>;
  }
}
