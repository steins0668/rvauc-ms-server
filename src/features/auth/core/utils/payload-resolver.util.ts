import { DbAccess } from "../../../../error";
import { ResultBuilder } from "../../../../utils";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";

type ResolverArgs = {
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
  student: async (args: ResolverArgs) => {
    const { dataService, user } = args;

    const query = await dataService.queryStudents({
      fn: async (query, converter) => {
        const result = await query.findFirst({
          where: converter({ filterType: "or", id: user.id }),
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

    if (!query.success)
      return failPayloadCreation({
        message: "Failed creating student payload.",
        err: query.error,
      });

    const { department, ...student } = query.result;

    const parse = Schemas.Payloads.AccessToken.student.strip().safeParse({
      ...user,
      role: "student",
      department: department.name,
      ...student,
    });

    return parse.success
      ? ResultBuilder.success(parse.data)
      : ResultBuilder.fail(
          Errors.Authentication.normalizeError({
            name: "AUTHENTICATION_PAYLOAD_CREATION_ERROR",
            message: "Failed parsing payload with student schema.",
            err: parse.error,
          })
        );
  },
};

function failPayloadCreation(args: { message: string; err: unknown }) {
  return ResultBuilder.fail(
    Errors.Authentication.normalizeError({
      name: "AUTHENTICATION_PAYLOAD_CREATION_ERROR",
      message: args.message,
      err: args.err,
    })
  );
}
