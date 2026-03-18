import { Request, Response } from "express";
import { execTransaction } from "../../../db/create-context";
import { Clock, TimeUtil } from "../../../utils";
import { Auth } from "../../auth";
import { Notifications } from "../../notifications";
import { Violation } from "../../violation";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleNewRecord(
  req: Request<{}, {}, Schemas.ComplianceData.NewRecord>,
  res: Response,
) {
  const {
    auth,
    body,
    complianceDataService,
    termDataService,
    userDataService,
    violationDataService,
    requestLogger: logger,
  } = req;

  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(
    auth,
    "full",
    "minimal",
  );

  if (!isAllowedPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `uniform-compliance/new-record`.",
    );

    return res.status(401).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  let notifications = [] as ReturnType<typeof notify>[];

  const result = {
    isCompliant: false,
    reasons: [] as string[],
  };

  let term;

  logger.log("debug", "Attempting to get current term from system config...");
  try {
    const queried = await termDataService.getCurrentTerm();
    if (!queried.success) throw queried.error;

    term = queried.result;
    logger.log("debug", "Success getting term config: " + JSON.stringify(term));
  } catch (err) {
    logger.log("error", "Failed getting current term from system config.", err);

    return res.status(500).json({
      success: false,
      message: internalErrMessage,
    });
  }

  logger.log("info", "Attempting to store new compliance record...");

  try {
    await execTransaction(async (tx) => {
      logger.log("debug", "Attempting to find student...");
      const queried = await userDataService.findStudentWhere({
        dbOrTx: tx,
        filter: { studentNumber: body.studentNumber },
      });

      if (!queried.success) throw queried.error; //  ! propagate error

      const { result: student } = queried;

      const now = Clock.now();

      logger.log("debug", "Attempting to store record...");
      const storedCompliance = await complianceDataService.storeRecord({
        dbOrTx: tx,
        value: {
          studentId: student.id,
          ...body,
          recordedAt: now.toISOString(),
          recordedMs: now.getTime(),
          datePh: TimeUtil.toPhDate(now),
          termId: term.id,
        },
      });

      if (!storedCompliance)
        throw new Errors.ComplianceData.ErrorClass({
          name: "COMPLIANCE_DATA_STORE_RECORD_ERROR",
          message: "Returning clause of attendance record insert failed.",
        });

      if (storedCompliance.recordCount > 1)
        throw new Errors.ComplianceData.ErrorClass({
          name: "COMPLIANCE_DATA_EXISTING_RECORD_ERROR",
          message:
            "This student has already recorded compliance today for the uniform type:" +
            body.uniformTypeId,
        });

      logger.log("debug", "Queueing compliance notification...");
      notifications.push(notifyCompliance(student.id, now));

      const { studentNumber, uniformTypeId, ...flags } = body;
      flags.hasId = true; //  todo: remove this when you implement id detection in the client
      const hasViolation = Object.values(flags).some((value) => !value);
      result.isCompliant = !hasViolation;

      if (hasViolation) {
        logger.log("info", "Notification detected.");
        const reasons = getViolationReasons(body);
        result.reasons = reasons;

        logger.log("debug", "Storing violation...");
        const storedViolation = await violationDataService.storeRecord({
          dbOrTx: tx,
          value: {
            complianceRecordId: storedCompliance.id,
            date: now.toISOString(),
            statusId: Violation.Data.Records.ViolationStatus.unsettled,
            studentId: student.id,
            reasons,
          },
        });

        if (!storedViolation.success) throw storedViolation.error; //  ! propagate error

        logger.log("debug", "Queueing violation notification...");
        notifications.push(notifyViolation(student.id, reasons));
      }

      return storedCompliance;
    });

    logger.log("debug", "Sending notifications...");
    // for (const notification of notifications) await notification;  //  todo: add message queues so you can implement this
    await Promise.all(notifications);

    logger.log("info", "Success storing new record.");
    return res.status(201).json({ success: true, result });
  } catch (err) {
    const error = Errors.ComplianceData.normalizeError({
      name: "COMPLIANCE_DATA_STORE_RECORD_ERROR",
      message: "Failed storing record.",
      err,
    });

    logger.log("error", "Failed storing new record.", error);

    const message =
      error.name === "COMPLIANCE_DATA_EXISTING_RECORD_ERROR"
        ? "You have already recorded compliance for today."
        : internalErrMessage;
    return res
      .status(Errors.ComplianceData.getErrStatusCode(error))
      .json({ success: false, message });
  }
}

function getViolationReasons(complianceData: Schemas.ComplianceData.NewRecord) {
  const { studentNumber, uniformTypeId, ...flags } = complianceData;
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
  notification: Notifications.Core.Schemas.NewNotification,
) {
  return await Notifications.Core.Services.Api.pushNotification(notification);
}
