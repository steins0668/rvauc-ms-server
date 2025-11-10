import { DbAccess } from "../../../../error";
import { ResultBuilder } from "../../../../utils";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";

export const payloadResolver = {
  professor: async (
    dataService: Services.UserData.Service,
    user: Schemas.UserData.AuthenticationDTO
  ) => {
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

    const payload = {
      ...user,
      role: "professor",
      college: college.name,
      facultyRank,
    } as Schemas.Payloads.AccessToken.RoleBased;

    return ResultBuilder.success(payload);
  },
  student: async (
    dataService: Services.UserData.Service,
    user: Schemas.UserData.AuthenticationDTO
  ) => {
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

    const payload = {
      ...user,
      role: "student",
      department: department.name,
      ...student,
    } as Schemas.Payloads.AccessToken.RoleBased;

    return ResultBuilder.success(payload);
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
