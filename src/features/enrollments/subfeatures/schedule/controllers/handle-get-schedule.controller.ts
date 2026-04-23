import { Request, Response } from "express";
import { StrictValidatedRequest } from "../../../../../interfaces";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

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
    Schemas.RequestQuery.UserSchedule
  >;

  logger.log("info", "Attempting to get schedule...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `enrollments/schedule/get-schedule`.",
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
      message: "Something went wrong. Please try again later.",
    });
  }

  const date = new Date(query.timeMs);
  const { payload: user } = auth;

  const queried = await classSchedService.getForToday({
    values: {
      userId: user.id,
      date,
      termId: term.id,
    },
    role: user.role,
  });

  if (!queried.success) {
    const { error } = queried;
    const { message } = error;

    logger.log("error", "Failed querying enrollments.", error);

    const status = Core.Errors.EnrollmentData.getErrStatusCode(error);

    return res.status(status).json({ success: false, message });
  }

  return res.status(200).json({
    success: true,
    result: queried.result,
    message: "Success retrieving schedule.",
  });
}
