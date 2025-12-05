import { Request, Response } from "express";
import { Clock, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Schemas } from "../schemas";
import { Data } from "../data";

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

  logger.log("info", "Attempting to create new attendance record...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(
    auth,
    "minimal"
  );

  if (!isAllowedPayload || auth.payload.role !== "student") {
    logger.log(
      "info",
      "Invalid payload attempted to access `attendance/new-record`."
    );

    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  let term;

  logger.log("debug", "Attempting to get current term from system config...");
  try {
    const queried = await enrollmentDataService.getCurrentTerm();
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

  const serverDate = Clock.now();
  const clientDate = body.date;

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

  logger.log("debug", "Attempting to get student's ongoing classs...");
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

  logger.log("debug", "Recording attendance...");
  const recorded = await attendanceDataService.storeAttendanceRecord({
    onConflict: "doNothing",
    value: {
      studentId: student.id,
      enrollmentId: enrollment.id,
      status: getAttendanceStatus({
        attendanceDate: finalDate,
        schedStartTime: enrollment.startTime,
        schedEndTime: enrollment.endTime,
      }),
      recordedAt: finalDate.toISOString(),
      recordedMs: finalDate.getTime(),
      datePh: TimeUtil.toPhDate(finalDate),
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

  const { result: attendance } = recorded;

  if (!attendance) {
    logger.log("info", "An attendance record already exists.");

    return res.status(409).json({
      success: false,
      result: { enrollment },
      message: "The student has already taken an attendance",
    });
  }

  logger.log("info", "Successfully recorded new attendance.");
  return res.status(200).json({
    success: true,
    result: { enrollment, attendance },
    message: "Success recording attendance",
  });
}

/**
 *
 * @param attendanceDate - date of attendance
 * @param schedStartTime - scheduled start time in seconds
 * @param schedEndTime - scheduled end time in seconds
 * @returns
 */
const getAttendanceStatus = (args: {
  attendanceDate: Date;
  schedStartTime: number;
  schedEndTime: number;
}) => {
  const { attendanceDate, schedStartTime, schedEndTime } = args;
  const attendanceTime = TimeUtil.secondsSinceMidnightPh(attendanceDate);

  const GRACE_PERIOD_OFFSET_SECONDS = 15 * 60; //  ! 15 minutes grace period
  const graceTime = schedStartTime + GRACE_PERIOD_OFFSET_SECONDS;

  return attendanceTime >= schedEndTime
    ? Data.attendanceStatus.absent
    : attendanceTime > graceTime
    ? Data.attendanceStatus.late
    : Data.attendanceStatus.present;
};
