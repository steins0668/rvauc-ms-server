import { Request, Response } from "express";
import { Clock, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Schemas } from "../schemas";
import { Data } from "../data";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleNewRecord(
  req: Request<{}, {}, Schemas.RequestBody.NewRecord>,
  res: Response,
) {
  const {
    body,
    auth,
    classSchedService,
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
      "Invalid payload attempted to access `enrollments/attendance/new-record`.",
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

  const serverDate = Clock.now();
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

  logger.log("debug", "Attempting to get student's ongoing classs...");
  const classQuery = await classSchedService.getForNow({
    userId: student.id,
    role: student.role,
    date: finalDate,
    termId: term.id,
  });

  if (!classQuery.success) {
    const { error } = classQuery;

    logger.log("error", "Failed querying enrollments.", error);

    const message =
      error.name === "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR"
        ? "The student does not have any ongoing classes in this room at the moment."
        : internalErrMessage;

    return res.status(Core.Errors.EnrollmentData.getErrStatusCode(error)).json({
      success: false,
      message,
    });
  }

  const { class: class_ } = classQuery.result;

  if (class_.offering.room !== body.room) {
    logger.log(
      "error",
      "Student attempted to take attendance in the wrong room.",
    );

    return res.status(403).json({
      success: false,
      message:
        "The student does not have any ongoing classes in this room at the moment.",
    });
  }

  logger.log("debug", "Recording attendance...");
  const recorded = await registrationService.newRecord({
    onConflict: "doUpdate",
    value: {
      studentId: student.id,
      classId: class_.id,
      classOfferingId: class_.offering.id,
      status: getAttendanceStatus({
        attendanceDate: finalDate,
        schedStartTime: class_.offering.startTime,
        schedEndTime: class_.offering.endTime,
      }),
      createdAt: finalDate.toISOString(),
      recordedAt: finalDate.toISOString(),
      recordedMs: finalDate.getTime(),
      updatedAt: finalDate.toISOString(),
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
    logger.log("info", "Returning clause of attendance record insert failed.");

    return res
      .status(500)
      .json({ success: false, message: internalErrMessage });
  }

  const message = attendance.isNew
    ? "Successfully recorded new attendance."
    : "An attendance was already recorded.";

  logger.log("info", message);
  return res.status(201).json({
    success: true,
    result: { enrollment: class_, attendance },
    message,
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
