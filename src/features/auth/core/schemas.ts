import z from "zod";
import { Data } from "./data";

export namespace Schemas {
  export namespace Payloads {
    export namespace AccessToken {
      const base = z.strictObject({
        id: z.number(),
        email: z.string(),
        username: z.string(),
        role: z.string(),
        surname: z.string(),
        firstName: z.string(),
        middleName: z.string().nullish().default(""),
        contactNumber: z.string().nullish(),
      });

      export const professor = z.object({
        ...base.shape,
        role: z.literal(Data.Records.roles.professor),
        college: z.string(),
        facultyRank: z.string(),
      });

      export const student = z.object({
        ...base.shape,
        role: z.literal(Data.Records.roles.student),
        department: z.string(),
        studentNumber: z.string(),
        yearLevel: z.number(),
        block: z.string(),
      });

      export const full = z.discriminatedUnion("role", [professor, student], {
        error: (iss) =>
          iss.input === undefined ? "Role is required." : "Invalid role.",
      });

      const minimalBase = z.strictObject({
        id: z.number(),
        surname: z.string(),
        firstName: z.string(),
        middleName: z.string().nullish().default(""),
      });

      export const minimalStudent = z
        .strictObject({
          ...minimalBase.shape,
          role: z.literal(Data.Records.roles.student),
          studentNumber: z.string(),
          department: z.string(),
          yearLevel: z.number(),
          block: z.string(),
        })
        .strip();

      export const minimal = z.discriminatedUnion("role", [
        professor, //  ! temporary. a `minimalProfessor` payload should be added once needed.
        minimalStudent,
      ]);

      export const microservice = z
        .strictObject({
          microservice: z.enum(["sessionBroker"]),
        })
        .strip();

      export type Professor = z.infer<typeof professor>;
      export type Student = z.infer<typeof student>;
      export type Full = z.infer<typeof full>;
      export type MinimalStudent = z.infer<typeof minimalStudent>;
      export type Minimal = z.infer<typeof minimal>;
      export type Microservice = z.infer<typeof microservice>;

      export const schemas = [
        { type: "full", schema: full },
        { type: "minimal", schema: minimal },
        { type: "microservice", schema: microservice },
      ] as const; //  ! add all future access token payload types here.

      export const schemaRecord = {
        full,
        minimal,
        microservice,
      } as const;

      export type AnySchema = (typeof schemas)[number];

      export type AnySchemaType = AnySchema extends infer S
        ? S extends { type: infer T }
          ? T
          : never
        : never;

      export type AnySchemaObject = AnySchema extends infer S
        ? S extends { schema: infer O }
          ? O
          : never
        : never;

      export type AnyPayload = AnySchema extends infer S
        ? S extends { type: infer T; schema: infer S }
          ? { type: T; payload: z.infer<S> }
          : never
        : never;

      export type AnyPayloadObject = AnySchema extends infer S
        ? S extends { schema: infer S }
          ? z.infer<S>
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
      role: z.enum(Data.Records.roles),
      email: z.string(),
      username: z.string(),
      surname: z.string(),
      firstName: z.string(),
      middleName: z.string().nullish(),
      contactNumber: z.string().nullish(),
    });
  }
}
