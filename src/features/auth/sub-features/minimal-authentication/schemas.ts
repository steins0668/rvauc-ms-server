import z from "zod";

export namespace Schemas {
  export namespace SignIn {
    export type Schema = z.infer<typeof schema>;

    export const schema = z.discriminatedUnion("type", [
      //  * rfid based
      z.strictObject({
        type: z.literal("rfid"),
        rfidUid: z.string({
          error: (iss) => {
            if (iss.code === "invalid_type") return "RFID UID must be a string";
            if (!iss.input) return "RFID UID is required.";
          },
        }),
      }),
      z.strictObject({
        type: z.literal("studentNumber"),
        studentNumber: z.string({
          error: (iss) => {
            if (iss.code === "invalid_type")
              return "Student number must be a string";
            if (!iss.input) return "Student number is required.";
          },
        }),
      }),
    ]);
  }
}
