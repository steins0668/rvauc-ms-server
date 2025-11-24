import { Request, Response } from "express";
import { execTransaction } from "../../../db/create-context";
import { Auth } from "../../auth";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

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

  try {
    const transaction = await execTransaction(async (tx) => {
      logger.log("debug", " Finding student...");
      const queried = await userDataService.findStudentWhere({
        dbOrTx: tx,
        filter: { studentNumber: body.studentNumber },
      });

      if (!queried.success) throw queried.error; //  ! propagate error

      const now = new Date().toISOString();

      logger.log("debug", "Storing record...");
      const stored = await violationDataService.storeRecords({
        dbOrTx: tx,
        values: [
          {
            studentId: queried.result.id,
            ...body,
            date: now,
          },
        ],
      });

      if (!stored.success) throw stored.error; //  ! propagate error

      return stored;
    });

    logger.log("info", "Success storing new record.");
    return res.status(200).json({ success: true, result: transaction.result });
  } catch (err) {
    const error = Errors.ViolationData.normalizeError({
      name: "VIOLATION_DATA_STORE_RECORD_ERROR",
      message: "Failed storing violation.",
      err,
    });

    logger.log("error", "Failed storing new record.", error);

    const message = "Failed storing new record. Please try again later.";
    return res
      .status(Errors.ViolationData.getErrStatusCode(error))
      .json({ success: false, message });
  }
}
