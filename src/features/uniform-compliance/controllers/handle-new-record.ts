import { Request, Response } from "express";
import { execTransaction } from "../../../db/create-context";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Notification } from "../../notification";
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
    auth,
    body,
    complianceDataService,
    userDataService,
    violationDataService,
    requestLogger: logger,
  } = req;

  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
    logger.log(
      "error",
      "Invalid payload attempted to access `uniform-compliance/new-record`."
    );

    res.status(401).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
    return;
  }

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
  let notifications = [] as ReturnType<typeof notify>[];

  try {
    const result = await execTransaction(async (tx) => {
      const studentQuery = await args.userDataService.findStudentWhere({
        dbOrTx: tx,
        filter: { studentNumber: args.body.studentNumber },
      });

      if (!studentQuery.success) throw studentQuery.error; //  ! propagate error

      const now = new Date();
      const nowISO = now.toISOString();
      const nowDateStr = now.toDateString(); //  * for logging and notif
      const storeComplianceRecord =
        await args.complianceDataService.storeRecords({
          dbOrTx: tx,
          values: [
            {
              studentId: studentQuery.result.id,
              ...args.body,
              createdAt: nowISO,
            },
          ],
        });

      if (!storeComplianceRecord.success) throw storeComplianceRecord.error; // ! propagate error
      const { id: studentId } = studentQuery.result;
      const { id: complianceRecordId } = storeComplianceRecord
        .result[0] as Types.Db.ViewModels.ComplianceRecord;

      notifications.push(
        notify({
          category: "uniform_compliance_recorded",
          userId: studentId,
          title: "Uniform Compliance Record",
          message: `Successfully recorded uniform compliance for ${nowDateStr}`,
        })
      );

      const { studentNumber, termId, uniformTypeId, ...flags } = args.body;
      const hasViolation = Object.values(flags).some((value) => !value);

      if (hasViolation) {
        const reasons = getViolationReasons(args.body);

        const storeViolationRecord =
          await args.violationDataService.storeRecords({
            dbOrTx: tx,
            values: [
              {
                complianceRecordId,
                date: nowISO,
                statusId: Violation.Data.Records.ViolationStatus.unsettled,
                studentId,
                reasons,
              },
            ],
          });

        if (!storeViolationRecord.success) throw storeViolationRecord.error; //  ! propagate error

        const reasonsStr = reasons.toString();
        notifications.push(
          notify({
            category: "violation_recorded",
            userId: studentId,
            title: "Violation Record",
            message: `A uniform compliance violation has been detected for the following reasons: ${reasonsStr} `,
          })
        );
      }

      return storeComplianceRecord;
    });

    // for (const notification of notifications) await notification;  //  todo: add message queues so you can implement this
    await Promise.all(notifications);

    return result;
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ComplianceData.normalizeError({
        name: "COMPLIANCE_DATA_STORE_RECORD_ERROR",
        message: "Failed storing record",
        err,
      })
    );
  }
}

function getViolationReasons(complianceData: Schemas.ComplianceData.NewRecord) {
  const { studentNumber, termId, uniformTypeId, ...flags } = complianceData;
  const reasons = [];

  if (!flags.hasId) reasons.push(Violation.Data.Records.ViolationReason.noId);
  if (!flags.validBottoms)
    reasons.push(Violation.Data.Records.ViolationReason.incorrectBottoms);
  if (!flags.validFootwear)
    reasons.push(Violation.Data.Records.ViolationReason.incorrectFootwear);
  if (!flags.validUpperwear)
    reasons.push(Violation.Data.Records.ViolationReason.incorrectUpperwear);

  return reasons;
}

async function notifyInternalError(args: { userId: number; message?: string }) {
  return await notify({
    category: "internal_error",
    userId: args.userId,
    title: "Internal error.",
    message: args.message ?? "Something went wrong. Please try again later.",
  });
}

async function notify(
  notification: Notification.Core.Schemas.PushNotification
) {
  return await Notification.Core.Services.Api.pushNotification(notification);
}
