import { Request, Response } from "express";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleNewRecord(
  req: Request<{}, {}, Schemas.RequestBody.NewRecord>,
  res: Response
) {
  const {
    body,
    auth,
    enrollmentDataService,
    attendanceDataService,
    requestLogger: logger,
  } = req;

  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(
    auth,
    "minimal"
  );

  if (!isAllowedPayload || auth.payload.role !== "student") {
    logger.log(
      "info",
      "Invalid payload attempted to access `uniform-compliance/new-record`."
    );

    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  let term;

  //  * get current term from system config
  try {
    const queried = await enrollmentDataService.getCurrentTerm();
    if (!queried.success) throw queried.error;

    logger.log("debug", "Success getting term config: " + JSON.stringify(term));
    term = queried.result;
  } catch (err) {
    logger.log("error", "Failed getting current term from system config.", err);

    return res.status(500).json({
      success: false,
      message: internalErrMessage,
    });
  }

  const serverDate = new Date();
  const clientDate = new Date(body.date);

  const MAX_DRIFT_MS = 30 * 1000; //  30 seconds max time drift
  const drift = Math.abs(serverDate.getTime() - clientDate.getTime());
  const isInvalidTime = drift > MAX_DRIFT_MS;

  if (isInvalidTime) {
    logger.log(
      "info",
      "Server-client time drift has exceeded maximum threshold. Falling back to server time..."
    );
  }

  const finalDate = isInvalidTime ? serverDate : clientDate;
  const { payload: student } = auth;

  //  * get ongoing class
  const queriedEnrollment = await enrollmentDataService.getActiveEnrollment({
    studentId: student.id,
    date: finalDate,
    termId: term.id,
  });

  if (!queriedEnrollment.success) {
    const { error } = queriedEnrollment;

    logger.log("error", "Failed querying enrollments.", error);

    const message =
      error.name === "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR"
        ? "This student does not have any ongoing classes at the moment."
        : internalErrMessage;

    return res.status(Core.Errors.EnrollmentData.getErrStatusCode(error)).json({
      success: false,
      message,
    });
  }

  const { result: enrollment } = queriedEnrollment;

  //  * record attendance
  const recorded = await attendanceDataService.storeAttendanceRecord({
    onConflict: "doNothing",
    value: {
      studentId: student.id,
      enrollmentId: enrollment.id,
      status: "",
      recordedAt: finalDate.toISOString(),
      recordedDate: "",
      recordedTime: 1,
    },
  });

  if (!recorded.success) {
    const { error } = recorded;

    logger.log("error", "Failed recording new attendance record.", error);

    return res.status(500).json({
      success: false,
      message: internalErrMessage,
    });
  }

  const { result } = recorded;

  if (!result) {
    logger.log("info", "An attendance record already exists.");

    return res.status(409).json({
      success: false,
      result: { enrollment },
      message: "The student has already taken an attendance",
    });
  }
}
