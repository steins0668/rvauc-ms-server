import z from "zod";
import { Data } from "./data";

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
          z.object({
            ...base.shape,
            role: z.literal(Data.Records.roles.student.name),
            department: z.string(),
            studentNumber: z.string(),
            yearLevel: z.number(),
            block: z.string(),
          }),
          //  * professor
          z.object({
            ...base.shape,
            role: z.literal(Data.Records.roles.professor.name),
            college: z.string(),
            facultyRank: z.string(),
          }),
        ],
        {
          error: (iss) =>
            iss.input === undefined ? "Role is required." : "Invalid role.",
        }
      );

      export const schemas = [
        { type: "roleBased", schema: roleBased },
        { type: "base", schema: base },
      ] as const; //  ! add all future access token payload types here.

      export type AnySchema = (typeof schemas)[number];

      export type AnyPayload = AnySchema extends infer S
        ? S extends { type: infer T; schema: infer S }
          ? { type: T; payload: z.infer<S> }
          : never
        : never;
    }

    export namespace RefreshToken {
      export type Payload = z.infer<typeof payload>;

      export const payload = z.object({
        userId: z.number(),
        sessionNumber: z.string(),
        isPersistentAuth: z.boolean().optional(),
      });

      export type Schema = z.infer<typeof schema>;

      export const schema = z.strictObject({
        refreshToken: z
          .string({
            error: (iss) => {
              if (iss.code === "invalid_type")
                return "Refresh token must be a string";
            },
          })
          .optional(),
      });
    }
  }

  export namespace UserData {
    export type AuthenticationDTO = z.infer<typeof authenticationDTO>;

    export const authenticationDTO = z.strictObject({
      id: z.number(),
      role: z.string(),
      email: z.string(),
      username: z.string(),
      surname: z.string(),
      firstName: z.string(),
      middleName: z.string().nullish(),
    });
  }
}
