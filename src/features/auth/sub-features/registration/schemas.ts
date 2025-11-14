import z from "zod";
import { Core } from "../../core";

const { Username, Password, StudentNumber } = Core.Data.Regex.Auth;

export namespace Schemas {
  export namespace Register {
    const base = z.object({
      roleId: z.number(),
      role: z.enum(Core.Data.Records.roles, {
        error: (iss) =>
          iss.input === undefined ? "Role is required." : "Invalid role.",
      }),
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
        .regex(Username, { error: "Invalid username." }),

      passwordHash: z
        .string({
          error: (iss) =>
            iss.input === undefined
              ? "Password is required."
              : "Invalid Password",
        })
        .regex(Password, {
          error: "Invalid password.",
        }),
      surname: z.string({
        error: (iss) =>
          iss.input === undefined ? "Surname is required." : "Invalid input.",
      }),
      firstName: z.string({
        error: (iss) =>
          iss.input === undefined
            ? "First name is required."
            : "Invalid input.",
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

    export const professor = z.object({
      ...base.shape,
      role: z.literal(Core.Data.Records.roles.professor),
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
    });

    export const student = z.object({
      ...base.shape,
      role: z.literal(Core.Data.Records.roles.student),
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
        .regex(StudentNumber, { error: "Invalid student number." }),
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
    });

    export type RoleBased = z.infer<typeof roleBased>;
    export const roleBased = z.discriminatedUnion(
      "roleId",
      [
        z.object({
          ...base.shape,
          roleId: z.literal(Core.Data.Records._roles.professor.id),
          role: z.literal(Core.Data.Records.roles.professor),
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
          ...base.shape,
          roleId: z.literal(Core.Data.Records._roles.student.id),
          role: z.literal(Core.Data.Records.roles.student),
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
            .regex(StudentNumber, { error: "Invalid student number." }),
          yearLevel: z
            .number()
            .min(1, {
              error:
                "Year must be between no lower than 1 and no higher than 4.",
            })
            .max(4, {
              error:
                "Year must be between no lower than 1 and no higher than 4.",
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
}
