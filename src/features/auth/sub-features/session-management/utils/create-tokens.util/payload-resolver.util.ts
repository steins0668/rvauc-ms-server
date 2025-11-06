import { DbAccess } from "../../../../../../error";
import { ResultBuilder } from "../../../../../../utils";
import { Core } from "../../../../core";
import { ViewModels } from "../../../../types";

export const payloadResolver = {
  professor: async (
    dataService: Core.Services.UserData.Service,
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
    } as Core.Schemas.Payloads.AccessToken.RoleBased;

    return ResultBuilder.success(payload);
  },
  student: async (
    dataService: Core.Services.UserData.Service,
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
    } as Core.Schemas.Payloads.AccessToken.RoleBased;

    return ResultBuilder.success(payload);
  },
};
