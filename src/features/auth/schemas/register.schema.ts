import z from "zod";
import { REGEX } from "../data";

const { USERNAME, PASSWORD } = REGEX.AUTH;

export type RegisterSchema = z.infer<typeof registerSchema>;

export const registerSchema = z.object({
  roleId: z.number(),
  email: z.email({
    error: (iss) =>
      iss.input === undefined ? "Email is required." : "Invalid email.",
  }),
  username: z
    .string({
      error: (iss) =>
        iss.input === undefined ? "Username is required." : "Invalid username.",
    })
    .regex(USERNAME, { error: "Invalid username." }),

  passwordHash: z
    .string({
      error: (iss) =>
        iss.input === undefined ? "Password is required." : "Invalid Password",
    })
    .regex(PASSWORD, {
      error: "Invalid password.",
    }),
  surname: z.string({
    error: (iss) =>
      iss.input === undefined ? "Surname is required." : "Invalid input.",
  }),
  firstName: z.string({
    error: (iss) =>
      iss.input === undefined ? "First name is required." : "Invalid input.",
  }),
  middleName: z.string().optional(),
  //  todo: update register flow to include contact number and automatically insert new students/professors to their respective tables.
  contactNumber: z.string({
    error: (iss) =>
      iss.input === undefined
        ? "Contact number is required."
        : "Invalid input.",
  }),
});
