import { Request, Response } from "express";
import { Auth } from "../../../../auth";
import { Schemas } from "../schemas";
import { Core } from "../../../core";
import { StrictValidatedRequest } from "../../../../../interfaces";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleGetSchedule(req: Request, res: Response) {
  const {
    auth,
    validated: { query },
    classSchedService,
    termDataService,
    requestLogger: logger,
  } = req as StrictValidatedRequest<
    {},
    {},
    {},
    Schemas.RequestQuery.StudentSchedule
  >;

  logger.log("info", "Attempting to get schedule...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(
    auth,
    "minimal"
  );

  if (!isAllowedPayload || auth.payload.role !== "student") {
    logger.log(
      "info",
      "Invalid payload attempted to access `enrollments/schedule/get-schedule`."
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

  const date = new Date(query.date);
  const { payload: student } = auth;

  const queried = await classSchedService.getForToday({
    studentId: student.id,
    date,
    termId: term.id,
  });

  if (!queried.success) {
    const { error } = queried;

    logger.log("error", "Failed querying enrollments.", error);

    const message =
      error.name === "ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR"
        ? "This student does not have any class scheduled for this day."
        : internalErrMessage;

    return res.status(Core.Errors.EnrollmentData.getErrStatusCode(error)).json({
      success: false,
      message,
    });
  }

  return res.status(200).json({
    success: true,
    result: { schedule: queried.result },
    message: "Success retrieving schedule.",
  });
}
