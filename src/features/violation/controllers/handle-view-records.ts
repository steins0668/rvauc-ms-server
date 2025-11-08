import { Request, Response } from "express";
import { Enums } from "../../../data";
import { execTransaction, TxContext } from "../../../db/create-context";
import { BaseResult } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Data } from "../data";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";
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
    const { userDataService, violationDataService, payload } = args;

    const transaction = await execTransaction(async (tx) => {
      const studentQuery = await fetchStudent({ tx, userDataService, payload });

      if (!studentQuery.success) return studentQuery; //  ! propagate error

      const studentId = studentQuery.result;
      const recordsQuery = await fetchRecords({
        tx,
        violationDataService,
        studentId,
      });

      return recordsQuery;
    });

    if (!transaction.success)
      //  ! propagate error
      return ResultBuilder.fail(
        Errors.ViolationData.normalizeError({
          name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
          message: "Failed to get records.",
          err: transaction.error,
        })
      );

    const rawRecords = transaction.result;
    const conversion = toDTORecord(rawRecords);

    return conversion;
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
  violationDataService: Services.ViolationData.Service;
  studentId: number;
}) {
  const { tx, violationDataService, studentId } = args;
  return await violationDataService.queryRecord({
    dbOrTx: tx,
    fn: async (query, converter) => {
      return await query.findMany({
        where: converter({ studentId }),
        orderBy: (records, { desc }) => [desc(records.date)],
        with: { status: true },
        limit: 6,
        columns: {
          studentId: false,
          complianceRecordId: false,
          statusId: false,
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

type ViolationReasonRecord = typeof Data.Records.ViolationReason;
type Reasons = ViolationReasonRecord[keyof ViolationReasonRecord][];

function toDTORecord(
  rawRecords: RawRecords
):
  | Types.ViolationResult.Success<Schemas.ViolationData.RecordDTO[]>
  | Types.ViolationResult.Fail {
  try {
    const dto = rawRecords.map((record) => {
      const { id, date: isoDate } = record;
      const rawDate = new Date(isoDate);
      const date = isoDate.split("T")[0] as string;
      const day = Enums.Days[rawDate.getDay()] as string;
      const hours = rawDate.getHours().toString().padStart(2, "0");
      const minutes = rawDate.getMinutes().toString().padStart(2, "0");
      const time = hours + ":" + minutes; //  * hh:mm format
      const status = record.status.name;
      const reasons = record.reasons as Reasons;

      return { id, date, day, time, status, reasons };
    });
    return ResultBuilder.success(dto);
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ViolationData.normalizeError({
        name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
        message: "Failed converting records to DTO.",
        err,
      })
    );
  }
}
