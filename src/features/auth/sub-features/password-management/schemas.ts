import z from "zod";
import { Core } from "../../core";

export namespace Schemas {
  export type ForgotPassword = z.infer<typeof forgotPassword>;

  export const forgotPassword = z.strictObject({
    email: z.email({
      error: (iss) =>
        iss.input === undefined ? "Email is required." : "Invalid email.",
    }),
  });

  export type VerifyCode = z.infer<typeof verifyCode>;

  export const verifyCode = z.strictObject({
    email: z.email({
      error: (iss) =>
        iss.input === undefined ? "Email is required." : "Invalid email.",
    }),
    code: z.string({
      error: (iss) =>
        iss.input === undefined ? "Code is required." : "Invalid code.",
    }),
  });

  export type ResetPassword = z.infer<typeof resetPassword>;

  export const resetPassword = z.strictObject({
    code: z.string({
      error: (iss) =>
        iss.input === undefined ? "Code is required." : "Invalid code.",
    }),
    password: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Password is required."
            : "Invalid Password",
      })
      .regex(Core.Data.Regex.Auth.Password, {
        error: "Invalid password.",
      }),
    confirmPassword: z.string({
      error: (iss) =>
        iss.input === undefined
          ? "Confirm Password is required."
          : "Invalid Password",
    }),
  });
}
