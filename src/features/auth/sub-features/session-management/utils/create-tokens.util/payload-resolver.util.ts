import { DbAccess } from "../../../../../../error";
import { ResultBuilder } from "../../../../../../utils";
import { UserDataService } from "../../../../services";
import { ViewModels } from "../../../../types";
import { Schemas } from "../../schemas";

export const payloadResolver = {
  professor: async (dataService: UserDataService, user: ViewModels.User) => {
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

    const { college, ...professor } = query.result;

    const payload = {
      userInfo: {
        ...user,
        role: "professor",
      },
      professorInfo: {
        college: college.name,
        ...professor,
      },
    } as Schemas.Payloads.AccessToken.Professor;

    return ResultBuilder.success(payload);
  },
  student: async (dataService: UserDataService, user: ViewModels.User) => {
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
      userInfo: {
        ...user,
        role: "student",
      },
      studentInfo: {
        department: department.name,
        ...student,
      },
    } as Schemas.Payloads.AccessToken.Student;

    return ResultBuilder.success(payload);
  },
};
