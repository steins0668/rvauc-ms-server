import { Request, Response } from "express";
import { StrictValidatedRequest } from "../../../../../interfaces";
import { Clock, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Data } from "../data";
import { Schemas } from "../schemas";

const internalErrMessage = "Something went wrong. Please try again later.";

const { roles } = Auth.Core.Data.Records;
const { scope } = Data.AttendanceQuery;
type Role = keyof typeof roles;
type Scopes = typeof scope;
type Scope = Scopes[keyof Scopes];

export function handleViewRecords<
  TRole extends Role,
  TScope extends Scope,
>(args: {
  allowedRoles: TRole[];
  scope: TScope;
  extractInput: (
    req: Request,
  ) => Partial<
    Extract<
      Schemas.MethodArgs.AttendanceQuery.All,
      { role: TRole; scope: TScope }
    >["values"]
  >;
}) {
  const { allowedRoles, scope, extractInput } = args;

  return async (req: Request, res: Response) => {
    const {
      auth,
      validated: { query },
      attendanceDataService,
      termDataService,
      requestLogger: logger,
    } = req as StrictValidatedRequest<
      {},
      {},
      {},
      Schemas.RequestQuery.AttendanceRecord
    >;

    logger.log("info", "Attempting to retrieve attendance record...");
    //  * authorize user
    const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

    if (
      !isAllowedPayload ||
      !allowedRoles.includes(auth.payload.role as TRole)
    ) {
      logger.log(
        "info",
        "Invalid payload attempted to access `enrollments/attendance/view-record`.",
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
      logger.log(
        "debug",
        "Success getting term config: " + JSON.stringify(term),
      );
    } catch (err) {
      logger.log(
        "error",
        "Failed getting current term from system config.",
        err,
      );

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

    let roleScope: Schemas.MethodArgs.AttendanceQuery.RoleScopes;

    logger.log("debug", "Resolving user role and query scope...");
    try {
      const { roleScopes } = Schemas.MethodArgs.AttendanceQuery;
      roleScope = roleScopes.parse(`${user.role}-${scope}`);
    } catch (error) {
      logger.log(
        "info",
        `User attempted to access invalid role-scope: ${user.role}-${scope}`,
      );
      return res.status(403).json({
        success: false,
        message: "Unable to access this resource. Please check your scope.",
      });
    }

    let queryContext: Schemas.MethodArgs.AttendanceQuery.All;

    let roleScopeValues: { [key: string]: any } = {};

    switch (roleScope) {
      case "student-class": {
        roleScopeValues = { studentId: user.id };
        break;
      }
      case "professor-class": {
        roleScopeValues = { professorId: user.id };
        break;
      }
      case "professor-student": {
        roleScopeValues = { professorId: user.id };
      }
    }

    logger.log("debug", "Resolving query context...");
    try {
      queryContext = Schemas.MethodArgs.AttendanceQuery.all.parse({
        roleScope,
        role: user.role,
        scope,
        values: {
          ...extractInput(req),
          ...roleScopeValues,
          termId: term.id,
          date: finalDate,
        },
      });
    } catch (error) {
      logger.log("error", "Failed to resolve query context.", error);

      return res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again later.",
      });
    }

    logger.log("debug", "Attempting to get attendance records...");
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
  };
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
