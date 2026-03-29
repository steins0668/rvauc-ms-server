import { Request, Response } from "express";
import { Clock, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Schemas } from "../schemas";
import { Data } from "../data";
import { StrictValidatedRequest } from "../../../../../interfaces";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleViewRecords(req: Request, res: Response) {
  const {
    auth,
    validated: { params, query },
    attendanceDataService,
    termDataService,
    requestLogger: logger,
  } = req as StrictValidatedRequest<
    Schemas.RequestParams.ClassId,
    {},
    {},
    Schemas.RequestQuery.AttendanceRecord
  >;

  logger.log("info", "Attempting to create new attendance record...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
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
  const clientDate = new Date(query.date);

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
  const { payload: user } = auth;

  logger.log("debug", "Attempting to get attendance records...");

  let values: { [key: string]: any } = {
    classId: params.classId,
    termId: term.id,
    date: finalDate,
  };

  switch (user.role) {
    case "student": {
      values = { ...values, studentId: user.id };
      break;
    }
    case "professor": {
      values = { ...values, professorId: user.id };
      break;
    }
    default: {
      throw new Auth.Core.Errors.Authentication.ErrorClass({
        name: "AUTHENTICATION_FORBIDDEN_ROLE_ERROR",
        message: "Role not supported.",
      });
    }
  }

  let queryContext: Schemas.MethodArgs.AttendanceQuery.All;

  try {
    queryContext = Schemas.MethodArgs.AttendanceQuery.all.parse({
      roleScope: `${user.role}-${query.scope}`,
      role: user.role,
      scope: query.scope,
      values,
    });
  } catch (error) {
    logger.log("error", "Failed attempt to access resource.", error);

    return res.status(403).json({
      success: false,
      message: "Unable to access this resource. Please check your inputs.",
    });
  }

  const queried = await attendanceDataService.getAttendance({
    constraints: { limit: 6 },
    queryContext,
  });

  if (!queried.success) {
    const { error } = queried;

    logger.log("error", "Failed retrieving attendance records.", error);

    return res
      .status(500)
      .json({ success: false, message: internalErrMessage });
  }

  logger.log("info", "Success retrieving attendance records");
  return res.status(200).json({
    success: true,
    result: queried.result,
    message: "Attendance list retrieved.",
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
