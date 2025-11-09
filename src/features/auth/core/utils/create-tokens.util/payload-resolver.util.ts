import { DbAccess } from "../../../../../error";
import { ResultBuilder } from "../../../../../utils";
import { ViewModels } from "../../../types";
import { Schemas } from "../../schemas";
import { Services } from "../../services";

export const payloadResolver = {
  professor: async (
    dataService: Services.UserData.Service,
    user: ViewModels.User
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
            message: "Failed querying professors.",
          });
        return result;
      },
    });

    if (!query.success) return query;

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
    user: ViewModels.User
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
            message: "Failed querying students.",
          });

        return result;
      },
    });

    if (!query.success) return query;

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
