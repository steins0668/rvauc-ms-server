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
    auth,
    body,
    violationDataService,
    userDataService,
    requestLogger: logger,
  } = req;

  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `violation/new-record`."
    );

    return res.status(401).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  logger.log("info", "Storing new compliance record...");
  const store = await storeRecord({
    userDataService,
    violationDataService,
    body,
  });

  if (!store.success) {
    const { error } = store;
    const message = "Failed storing new record. Please try again later.";

    logger.log("error", "Failed storing new record.", error);
    return res
      .status(Errors.ViolationData.getErrStatusCode(error))
      .json({ success: false, message });
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
  try {
    return await execTransaction(async (tx) => {
      const studentQuery = await args.userDataService.findStudentWhere({
        dbOrTx: tx,
        filter: { studentNumber: args.body.studentNumber },
      });

      if (!studentQuery.success) throw studentQuery.error; //  ! propagate error

      const now = new Date().toISOString();
      const stored = await args.violationDataService.storeRecords({
        dbOrTx: tx,
        values: [
          {
            studentId: studentQuery.result.id,
            ...args.body,
            date: now,
          },
        ],
      });

      if (!stored.success) throw stored.error; //  ! propagate error

      return stored;
    });
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ViolationData.normalizeError({
        name: "VIOLATION_DATA_STORE_RECORD_ERROR",
        message: "Failed storing record",
        err,
      })
    );
  }
}
