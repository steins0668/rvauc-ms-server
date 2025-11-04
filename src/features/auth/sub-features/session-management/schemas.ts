import z from "zod";
export namespace Schemas {
  export namespace Payloads {
    export namespace AccessToken {
      export type User = z.infer<typeof user>;
      export type Student = z.infer<typeof student>;
      export type Professor = z.infer<typeof professor>;

      export const user = z.strictObject({
        userInfo: z.object({
          email: z.string(),
          username: z.string(),
          role: z.string(),
        }),
      });

      export const student = z.strictObject({
        ...user.shape,
        studentInfo: z.object({
          department: z.string(),
          studentNumber: z.string(),
          yearLevel: z.number(),
          block: z.string(),
        }),
      });

      export const professor = z.strictObject({
        ...user.shape,
        professorInfo: z.object({
          college: z.string(),
          facultyRank: z.string(),
        }),
      });
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
