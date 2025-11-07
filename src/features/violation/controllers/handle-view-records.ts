import { Request, Response } from "express";
import { Auth } from "../../auth";
import { Services } from "../services";
import { ResultBuilder } from "../../../utils";
import { Errors } from "../errors";
import { Types } from "../types";

export async function handleViewRecords(req: Request, res: Response) {
  const {
    violationDataService,
    userDataService,
    authenticationPayload: payload,
    requestLogger: logger,
  } = req;

  const resolution = await resolveRecords({
    violationDataService,
    userDataService,
    payload,
  });

  if (!resolution.success) {
    const { error } = resolution;
    const message = "Failed to get records.";

    res
      .status(Errors.ViolationData.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", message, error);
    return;
  }

  res.status(200).json({ success: true, result: resolution.result });
}

async function resolveRecords(args: {
  violationDataService: Services.ViolationData.Service;
  userDataService: Auth.Core.Services.UserData.Service;
  payload: Auth.Core.Schemas.Payloads.AccessToken.RoleBased;
}) {
  const { violationDataService, userDataService, payload } = args;
  switch (payload.role) {
    case "student": {
      const resolver = recordsResolver["student"];
      return await resolver({
        violationDataService,
        userDataService,
        payload,
      });
    }
    default:
      return ResultBuilder.fail(
        new Errors.ViolationData.ErrorClass({
          name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
          message: "Role not implemented yet.",
        })
      );
  }
}

const recordsResolver = {
  student: async (args: {
    violationDataService: Services.ViolationData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: Extract<
      Auth.Core.Schemas.Payloads.AccessToken.RoleBased,
      { role: "student" }
    >;
  }) => {
    const { userDataService, payload } = args;

    //  todo: implement transaction to be able to apply offset and pagination for records
    const query = await userDataService.queryStudents({
      fn: async (query, converter) => {
        const student = await query.findFirst({
          where: converter({ studentNumber: payload.studentNumber }),
          with: {
            violationRecords: {
              orderBy: (records, { desc }) => [desc(records.date)],
              with: { status: true },
              limit: 6,
            },
          },
        });

        return student;
      },
    });

    if (!query.success)
      //  ! propagate error
      return ResultBuilder.fail(
        Errors.ViolationData.normalizeError({
          name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
          message: "Failed to get records",
          err: query.error,
        })
      );

    return ResultBuilder.success(query.result.violationRecords);
  },

  professor: async (args: {
    violationDataService: Services.ViolationData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: Extract<
      Auth.Core.Schemas.Payloads.AccessToken.RoleBased,
      { role: "professor" }
    >;
  }) => [] as Types.Db.ViewModels.ViolationRecord[], //  todo: do this
};
