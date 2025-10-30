import z from "zod";
import { ENUMS, REGEX } from "../data";

const { USERNAME, PASSWORD, STUDENT_NUMBER } = REGEX.AUTH;

export namespace RegisterSchemas {
  export type Base = z.infer<typeof base>;

  export const user = z.object({
    roleId: z.number(),
    email: z.email({
      error: (iss) =>
        iss.input === undefined ? "Email is required." : "Invalid email.",
    }),
    username: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Username is required."
            : "Invalid username.",
      })
      .regex(USERNAME, { error: "Invalid username." }),

    passwordHash: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Password is required."
            : "Invalid Password",
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

  export const base = z.discriminatedUnion(
    "roleId",
    [
      z.object({
        ...user.shape,
        roleId: z.literal(ENUMS.ROLES.professor),
        collegeId: z.number({
          error: (iss) =>
            iss.input === undefined
              ? "College id is required."
              : "Invalid college id.",
        }),
        facultyRank: z.string({
          error: (iss) =>
            iss.input === undefined
              ? "Faculty rank is required."
              : "Invalid faculty rank.",
        }),
      }),
      z.object({
        ...user.shape,
        roleId: z.literal(ENUMS.ROLES.student),
        //  todo: handle constraints for current valid ids
        departmentId: z.number({
          error: (iss) =>
            iss.input === undefined
              ? "Department is required."
              : "Invalid department.",
        }),

        studentNumber: z
          .string({
            error: (iss) =>
              iss.input === undefined
                ? "Student number is required."
                : "Invalid student number.",
          })
          .regex(STUDENT_NUMBER, { error: "Invalid student number." }),
        yearLevel: z
          .number()
          .min(1, {
            error: "Year must be between no lower than 1 and no higher than 4.",
          })
          .max(4, {
            error: "Year must be between no lower than 1 and no higher than 4.",
          }),

        //  todo: add validation for available blocks
        block: z.string(),
      }),
    ],
    {
      error: (iss) =>
        iss.input === undefined ? "Role id is required." : "Invalid role id.",
    }
  );
}
