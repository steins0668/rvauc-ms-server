import { Request, Response } from "express";
import { execTransaction } from "../../../db/create-context";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Violation } from "../../violation";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";
import { Types } from "../types";

export async function handleNewRecord(
  req: Request<{}, {}, Schemas.ComplianceData.NewRecord>,
  res: Response
) {
  const {
    body,
    complianceDataService,
    userDataService,
    violationDataService,
    requestLogger: logger,
  } = req;

  logger.log("debug", "Storing new compliance record...");
  const store = await storeRecord({
    userDataService,
    complianceDataService,
    violationDataService,
    body,
  });

  if (!store.success) {
    const { error } = store;
    const message = "Failed storing new record. Please try again later.";

    res
      .status(Errors.ComplianceData.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", message, error);

    return;
  }

  logger.log("debug", "Success storing new record.");
  res.status(200).json({ success: true, result: store.result });
}

async function storeRecord(args: {
  userDataService: Auth.Core.Services.UserData.Service;
  complianceDataService: Services.ComplianceData.Service;
  violationDataService: Violation.Services.ViolationData.Service;
  body: Schemas.ComplianceData.NewRecord;
}): Promise<
  | Types.ComplianceResult.Success<Types.Db.ViewModels.ComplianceRecord[]>
  | Types.ComplianceResult.Fail
> {
  const insertion = await execTransaction(async (tx) => {
    const studentQuery = await args.userDataService.findStudentWhere({
      dbOrTx: tx,
      filter: { studentNumber: args.body.studentNumber },
    });

    if (!studentQuery.success) return studentQuery; //  ! propagate error

    const now = new Date().toISOString();
    const storeComplianceRecord = await args.complianceDataService.storeRecords(
      {
        dbOrTx: tx,
        values: [
          {
            studentId: studentQuery.result.id,
            ...args.body,
            createdAt: now,
          },
        ],
      }
    );

    if (!storeComplianceRecord.success) return storeComplianceRecord; // ! propagate error

    const { studentNumber, termId, uniformTypeId, ...flags } = args.body;
    const hasViolation = Object.values(flags).some((value) => !value);

    if (hasViolation) {
      const { id: complianceRecordId } = storeComplianceRecord
        .result[0] as Types.Db.ViewModels.ComplianceRecord;
      const { id: studentId } = studentQuery.result;

      const reasons = [];

      if (!flags.hasId)
        reasons.push(Violation.Data.Records.ViolationReason.noId);
      if (!flags.validBottoms)
        reasons.push(Violation.Data.Records.ViolationReason.incorrectBottoms);
      if (!flags.validFootwear)
        reasons.push(Violation.Data.Records.ViolationReason.incorrectFootwear);
      if (!flags.validUpperwear)
        reasons.push(Violation.Data.Records.ViolationReason.incorrectUpperwear);

      const storeViolationRecord = await args.violationDataService.storeRecords(
        {
          dbOrTx: tx,
          values: [
            {
              complianceRecordId,
              date: now,
              statusId: Violation.Data.Records.ViolationStatus.unsettled,
              studentId,
              reasons,
            },
          ],
        }
      );

      if (!storeViolationRecord.success) return storeViolationRecord; //  ! propagate error
    }

    return storeComplianceRecord;
  });

  if (!insertion.success)
    //  ! propagate error
    return ResultBuilder.fail(
      Errors.ComplianceData.normalizeError({
        name: "COMPLIANCE_DATA_STORE_RECORD_ERROR",
        message: "Failed storing record",
        err: insertion.error,
      })
    );

  return insertion;
}
