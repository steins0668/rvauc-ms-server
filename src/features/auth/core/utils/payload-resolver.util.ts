import { DbAccess } from "../../../../error";
import { BaseResult } from "../../../../types";
import { ResultBuilder } from "../../../../utils";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";
import { Types } from "../types";

type ResolverArgs = {
  type: Schemas.Payloads.AccessToken.AnySchemaType;
  dataService: Services.UserData.Service;
  user: Schemas.UserData.AuthenticationDTO;
};

export const payloadResolver = {
  professor: async (args: ResolverArgs) => {
    const { dataService, user } = args;

    const query = await dataService.queryProfessors({
      fn: async (query, converter) => {
        const result = await query.findFirst({
          where: converter({ filterType: "or", id: user.id }),
          with: { college: true },
        });

        if (result === undefined)
          throw new DbAccess.ErrorClass({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Could not find professor.",
          });
        return result;
      },
    });

    if (!query.success)
      return failPayloadCreation({
        message: "Failed creating professor payload.",
        err: query.error,
      });

    const { college, facultyRank } = query.result;

    const parse = Schemas.Payloads.AccessToken.professor.strip().safeParse({
      ...user,
      role: "professor",
      college: college.name,
      facultyRank,
    });

    return parse.success
      ? ResultBuilder.success(parse.data)
      : ResultBuilder.fail(
          Errors.Authentication.normalizeError({
            name: "AUTHENTICATION_PAYLOAD_CREATION_ERROR",
            message: "Failed parsing payload with professor schema.",
            err: parse.error,
          })
        );
  },
  student,
};

async function student(
  args: ResolverArgs & { type: "full" }
): Promise<
  | Types.AuthenticationResult.Success<Schemas.Payloads.AccessToken.Student>
  | Types.AuthenticationResult.Fail
>;
async function student(
  args: ResolverArgs & { type: "minimal" }
): Promise<
  | Types.AuthenticationResult.Success<Schemas.Payloads.AccessToken.MinimalStudent>
  | Types.AuthenticationResult.Fail
>;
async function student(args: ResolverArgs) {
  const { type = "full", dataService, user } = args;

  const query = await getStudent({ dataService, user });

  if (!query.success)
    return failPayloadCreation({
      message: "Failed creating student payload.",
      err: query.error,
    });

  const { result: student } = query;

  return studentDTOtoPayload({ type, user, student });
}

async function getStudent(args: {
  dataService: Services.UserData.Service;
  user: Schemas.UserData.AuthenticationDTO;
}) {
  return await args.dataService.queryStudents({
    fn: async (query, converter) => {
      const result = await query.findFirst({
        where: converter({ filterType: "or", id: args.user.id }),
        with: { department: true },
      });

      if (result === undefined)
        throw new DbAccess.ErrorClass({
          name: "DB_ACCESS_QUERY_ERROR",
          message: "Could not find student.",
        });

      return result;
    },
  });
}

function studentDTOtoPayload(args: {
  type: Schemas.Payloads.AccessToken.AnySchemaType;
  user: Schemas.UserData.AuthenticationDTO;
  student: Awaited<ReturnType<typeof getStudent>> extends
    | BaseResult.Success<infer R>
    | BaseResult.Fail<infer _>
    ? R
    : never;
}):
  | Types.AuthenticationResult.Success<
      | Schemas.Payloads.AccessToken.Student
      | Schemas.Payloads.AccessToken.MinimalStudent
    >
  | Types.AuthenticationResult.Fail {
  const { type, user, student } = args;
  const { department, ...studentProfile } = student;

  const schema =
    type === "full"
      ? Schemas.Payloads.AccessToken.student
      : type === "minimal"
      ? Schemas.Payloads.AccessToken.minimalStudent
      : null;

  if (!schema)
    return failPayloadCreation({ message: `Invalid payload type ${type}` });

  const parse = schema.strip().safeParse({
    ...user,
    role: "student",
    department: department.name,
    ...studentProfile,
  });

  return parse.success
    ? ResultBuilder.success(parse.data)
    : failPayloadCreation({
        message: "Failed validating payload with student schema.",
        err: parse.error,
      });
}

function failPayloadCreation(args: {
  message: string;
  err?: unknown;
}): Types.AuthenticationResult.Fail {
  return ResultBuilder.fail(
    Errors.Authentication.normalizeError({
      name: "AUTHENTICATION_PAYLOAD_CREATION_ERROR",
      message: args.message,
      err: args.err,
    })
  );
}
