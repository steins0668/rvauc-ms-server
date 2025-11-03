import z from "zod";
import { Registration } from "../registration";

export namespace Schemas {
  export type ForgotPassword = z.infer<typeof forgotPassword>;

  export const forgotPassword = z.strictObject({
    email: z.email({
      error: (iss) =>
        iss.input === undefined ? "Email is required." : "Invalid email.",
    }),
  });

  export type ResetPassword = z.infer<typeof resetPassword>;

  export const resetPassword = z.strictObject({
    password: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Password is required."
            : "Invalid Password",
      })
      .regex(Registration.Data.Regex.Auth.Password, {
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
