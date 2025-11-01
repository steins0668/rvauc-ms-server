import z from "zod";

export namespace Schemas {
  export type ForgotPassword = z.infer<typeof forgotPassword>;

  export const forgotPassword = z.strictObject({
    email: z.email({
      error: (iss) =>
        iss.input === undefined ? "Email is required." : "Invalid email.",
    }),
  });
}
