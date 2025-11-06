import z from "zod";
import { Core } from "../../core";
export namespace Schemas {
  export namespace Payloads {
    export namespace AccessToken {
      const base = z.strictObject({
        email: z.string(),
        username: z.string(),
        role: z.string(),
      });

      export type RoleBased = z.infer<typeof roleBased>;
      export const roleBased = z.discriminatedUnion(
        "role",
        [
          //  * student
          z.strictObject({
            ...base.shape,
            role: z.literal(Core.Data.Records.roles.student.name),
            department: z.string(),
            studentNumber: z.string(),
            yearLevel: z.number(),
            block: z.string(),
          }),
          //  * professor
          z.strictObject({
            ...base.shape,
            role: z.literal(Core.Data.Records.roles.professor.name),
            college: z.string(),
            facultyRank: z.string(),
          }),
        ],
        {
          error: (iss) =>
            iss.input === undefined ? "Role is required." : "Invalid role.",
        }
      );
    }

    export namespace RefreshToken {
      export type Payload = z.infer<typeof payload>;

      export const payload = z.object({
        userId: z.number(),
        sessionNumber: z.string(),
        isPersistentAuth: z.boolean().optional(),
      });
    }
  }

  export namespace SignIn {
    export type Schema = z.infer<typeof schema>;

    export const schema = z.object({
      identifier: z.string({
        error: (iss) => {
          if (iss.code === "invalid_type") return "Identifier must be a string";
          if (!iss.input) return "Username or email is required.";
        },
      }),

      password: z.string({
        error: (iss) => {
          if (iss.code === "invalid_type") return "Password must be a string";
          if (!iss.input) return "Password is required.";
        },
      }),

      isPersistentAuth: z.boolean().optional(),
    });
  }
}
