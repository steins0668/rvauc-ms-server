import { Request, Response } from "express";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Errors } from "../errors";
import { Services } from "../services";
import { Types } from "../types";
import { execTransaction, TxContext } from "../../../db/create-context";
import { Schemas } from "../schemas";
import { Data } from "../data";
import { Enums } from "../../../data";
import { BaseResult } from "../../../types";

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

async function fetchStudent(args: {
  tx: TxContext;
  userDataService: Auth.Core.Services.UserData.Service;
  payload: Extract<
    Auth.Core.Schemas.Payloads.AccessToken.RoleBased,
    { role: "student" }
  >;
}) {
  const { tx, userDataService, payload } = args;
  return await userDataService.queryStudents({
    dbOrTx: tx,
    fn: async (query, converter) => {
      return await query
        .findFirst({
          where: converter({ studentNumber: payload.studentNumber }),
        })
        .then((result) => result?.id);
    },
  });
}

async function fetchRecords(args: {
  tx: TxContext;
  complianceDataService: Services.ComplianceData.Service;
  studentId: number;
}) {
  const { tx, complianceDataService, studentId } = args;
  return await complianceDataService.queryRecord({
    dbOrTx: tx,
    fn: async (query, converter) => {
      return await query.findMany({
        where: converter({ studentId }),
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
      });
    },
  });
}

type FetchRecordsResult = Awaited<ReturnType<typeof fetchRecords>>;
type RawRecords = FetchRecordsResult extends
  | BaseResult.Fail<infer _>
  | BaseResult.Success<infer R>
  ? R
  : never;

function toDTORecord(rawRecords: RawRecords): Schemas.RecordDTO[] {
  return rawRecords.map((record) => {
    const { uniformType, createdAt, ...flags } = record;

    const rawDate = new Date(createdAt);
    const date = createdAt.split("T")[0] as string;
    const day = Enums.Days[rawDate.getDay()] as string;
    const hours = rawDate.getHours().toString().padStart(2, "0");
    const minutes = rawDate.getMinutes().toString().padStart(2, "0");
    const time = hours + ":" + minutes; //  * hh:mm format

    const hasViolation = Object.values(flags).some((value) => !value);
    const status = hasViolation
      ? Data.Enums.ComplianceStatus.NonCompliant
      : Data.Enums.ComplianceStatus.Compliant;

    return { date, day, time, status };
  });
}
