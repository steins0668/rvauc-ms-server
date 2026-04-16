import { Request, Response } from "express";
import { Clock } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Schemas } from "../schemas";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleNewRfidScan(
  req: Request<{}, {}, Schemas.RequestBody.NewRecord>,
  res: Response,
) {
  const {
    body,
    auth,
    attendanceRegistrationService: registrationService,
    termDataService,
    requestLogger: logger,
  } = req;

  logger.log("info", "Attempting to create new attendance record...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(
    auth,
    "minimal",
  );

  if (!isAllowedPayload || auth.payload.role !== "student") {
    logger.log(
      "info",
      `Invalid payload attempted to access ${req.method} ${req.originalUrl}`,
    );

    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

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

  const serverDate = Clock.now(body.date);
  const clientDate = body.date;

  const MAX_DRIFT_MS = 30 * 1000; //  30 seconds max time drift
  const drift = Math.abs(serverDate.getTime() - clientDate.getTime());
  const isInvalidTime = drift > MAX_DRIFT_MS;

  if (isInvalidTime) {
    logger.log(
      "info",
      "Server-client time drift has exceeded maximum threshold. Falling back to server time...",
    );
  }

  const finalDate = isInvalidTime ? serverDate : clientDate;
  const { payload: student } = auth;

  logger.log("debug", "Recording attendance...");
  const recorded = await registrationService.recordAttendanceForSession({
    values: { termId: term.id, studentId: student.id, recordedDate: finalDate },
  });

  if (!recorded.success) {
    const { error } = recorded;

    logger.log("error", "Failed recording new attendance record.", error);

    const message =
      error.name === "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR"
        ? error.message
        : internalErrMessage;

    return res.status(500).json({
      success: false,
      message,
    });
  }

  const { attendance } = recorded.result;

  const message = attendance.isNew
    ? "Successfully recorded new attendance."
    : "An attendance was already recorded.";

  logger.log("info", message);

  return res.status(201).json({
    success: true,
    result: recorded.result,
    message,
  });
}
