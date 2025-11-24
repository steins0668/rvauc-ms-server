import { Request, Response } from "express";
import { execTransaction } from "../../../db/create-context";
import { Auth } from "../../auth";
import { Notifications } from "../../notifications";
import { Violation } from "../../violation";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
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

  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(
    auth,
    "full",
    "minimal"
  );

  if (!isAllowedPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `uniform-compliance/new-record`."
    );

    return res.status(401).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  let notifications = [] as ReturnType<typeof notify>[];

  logger.log("info", "Attempting to store new compliance record...");

  try {
    const transaction = await execTransaction(async (tx) => {
      logger.log("debug", "Attempting to find student...");
      const queried = await userDataService.findStudentWhere({
        dbOrTx: tx,
        filter: { studentNumber: body.studentNumber },
      });

      if (!queried.success) throw queried.error; //  ! propagate error

      const now = new Date();

      logger.log("debug", "Attempting to store record...");
      const storedCompliance = await complianceDataService.storeRecord({
        dbOrTx: tx,
        value: {
          studentId: queried.result.id,
          ...body,
          createdAt: now.toISOString(),
        },
      });

      if (!storedCompliance.success) throw storedCompliance.error; // ! propagate error
      const { id: studentId } = queried.result;
      const { id: complianceRecordId } = storedCompliance
        .result[0] as Types.Db.ViewModels.ComplianceRecord;

      logger.log("debug", "Queueing compliance notification...");
      notifications.push(notifyCompliance(studentId, now));

      const { studentNumber, termId, uniformTypeId, ...flags } = body;
      const hasViolation = Object.values(flags).some((value) => !value);

      if (hasViolation) {
        logger.log("info", "Notification detected.");
        const reasons = getViolationReasons(body);

        logger.log("debug", "Storing violation...");
        const storedViolation = await violationDataService.storeRecord({
          dbOrTx: tx,
          value: {
            complianceRecordId,
            date: now.toISOString(),
            statusId: Violation.Data.Records.ViolationStatus.unsettled,
            studentId,
            reasons,
          },
        });

        if (!storedViolation.success) throw storedViolation.error; //  ! propagate error

        logger.log("debug", "Queueing violation notification...");
        notifications.push(notifyViolation(studentId, reasons));
      }

      return storedCompliance;
    });

    logger.log("debug", "Sending notifications...");
    // for (const notification of notifications) await notification;  //  todo: add message queues so you can implement this
    await Promise.all(notifications);

    logger.log("info", "Success storing new record.");
    return res.status(200).json({ success: true, result: transaction.result });
  } catch (err) {
    const error = Errors.ComplianceData.normalizeError({
      name: "COMPLIANCE_DATA_STORE_RECORD_ERROR",
      message: "Failed storing record.",
      err,
    });

    logger.log("error", "Failed storing new record.", error);

    const message = "Failed storing new record. Please try again later.";
    return res
      .status(Errors.ComplianceData.getErrStatusCode(error))
      .json({ success: false, message });
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

async function notifyCompliance(userId: number, date: Date) {
  return notify({
    category: "uniform_compliance_recorded",
    userId,
    title: "Uniform Compliance Record",
    message: `Successfully recorded uniform compliance for ${date.toDateString()}`,
  });
}

async function notifyViolation(userId: number, reasons: string[]) {
  return notify({
    category: "violation_recorded",
    userId,
    title: "Violation Record",
    message: `A uniform compliance violation has been detected for the following reasons: ${reasons.toString()} `,
  });
}

async function notify(
  notification: Notifications.Core.Schemas.NewNotification
) {
  return await Notifications.Core.Services.Api.pushNotification(notification);
}
