import { Request, Response } from "express";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Errors } from "../errors";
import { Services } from "../services";
import { Types } from "../types";

export async function handleViewRecords(req: Request, res: Response) {
  const {
    complianceDataService,
    userDataService,
    authenticationPayload: payload,
    requestLogger: logger,
  } = req;

  const resolution = await resolveRecords({
    complianceDataService,
    userDataService,
    payload,
  });

  if (!resolution.success) {
    const { error } = resolution;
    const message = "Failed to get records.";

    res
      .status(Errors.ComplianceData.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", message, error);
    return;
  }

  res.status(200).json({ success: true, result: resolution.result });
}

async function resolveRecords(args: {
  complianceDataService: Services.ComplianceData.Service;
  userDataService: Auth.Core.Services.UserData.Service;
  payload: Auth.Core.Schemas.Payloads.AccessToken.RoleBased;
}) {
  const { complianceDataService, userDataService, payload } = args;
  switch (payload.role) {
    case "student": {
      const resolver = recordsResolver["student"];
      return await resolver({
        complianceDataService,
        userDataService,
        payload,
      });
    }
    default:
      return ResultBuilder.fail(
        new Errors.ComplianceData.ErrorClass({
          name: "COMPLIANCE_DATA_QUERY_RECORD_ERROR",
          message: "Role not implemented yet.",
        })
      );
  }
}

const recordsResolver = {
  student: async (args: {
    complianceDataService: Services.ComplianceData.Service;
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
            complianceRecords: {
              orderBy: (records, { desc }) => [
                desc(records.termId),
                desc(records.createdAt),
              ],
              with: { uniformType: true },
              limit: 6,
              columns: {
                id: false,
                studentId: false,
                uniformTypeId: false,
                termId: false,
              },
            },
          },
        });

        return student;
      },
    });

    if (!query.success)
      //  ! propagate error
      return ResultBuilder.fail(
        Errors.ComplianceData.normalizeError({
          name: "COMPLIANCE_DATA_QUERY_RECORD_ERROR",
          message: "Failed to get records",
          err: query.error,
        })
      );

    return ResultBuilder.success(query.result.complianceRecords);
  },

  professor: async (args: {
    complianceDataService: Services.ComplianceData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: Extract<
      Auth.Core.Schemas.Payloads.AccessToken.RoleBased,
      { role: "professor" }
    >;
  }) => [] as Types.Db.ViewModels.ComplianceRecord[], //  todo: do this
};
