import { Request, Response } from "express";
import { execTransaction } from "../../../db/create-context";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";
import { Types } from "../types";

export async function handleNewRecord(
  req: Request<{}, {}, Schemas.ViolationData.NewRecord>,
  res: Response
) {
  const {
    body,
    violationDataService,
    userDataService,
    requestLogger: logger,
  } = req;

  logger.log("debug", "Storing new compliance record...");
  const store = await storeRecord({
    userDataService,
    violationDataService,
    body,
  });

  if (!store.success) {
    const { error } = store;
    const message = "Failed storing new record. Please try again later.";

    res
      .status(Errors.ViolationData.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", message, error);

    return;
  }

  logger.log("debug", "Success storing new record.");
  res.status(200).json({ success: true, result: store.result });
}

async function storeRecord(args: {
  userDataService: Auth.Core.Services.UserData.Service;
  violationDataService: Services.ViolationData.Service;
  body: Schemas.ViolationData.NewRecord;
}): Promise<
  | Types.ViolationResult.Success<Types.Db.ViewModels.ViolationRecord[]>
  | Types.ViolationResult.Fail
> {
  const insertion = await execTransaction(async (tx) => {
    const studentQuery = await args.userDataService.findStudentWhere({
      dbOrTx: tx,
      filter: { studentNumber: args.body.studentNumber },
    });

    if (!studentQuery.success) return studentQuery; //  ! propagate error

    const now = new Date().toISOString();
    return await args.violationDataService.storeRecords({
      dbOrTx: tx,
      values: [
        {
          studentId: studentQuery.result.id,
          ...args.body,
          date: now,
        },
      ],
    });
  });

  if (!insertion.success)
    //  ! propagate error
    return ResultBuilder.fail(
      Errors.ViolationData.normalizeError({
        name: "VIOLATION_DATA_STORE_RECORD_ERROR",
        message: "Failed storing record",
        err: insertion.error,
      })
    );

  return insertion;
}
