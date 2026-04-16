import { Request, Response } from "express";
import { StrictValidatedRequest } from "../../../../../interfaces";
import { Auth } from "../../../../auth";
import { Schemas } from "../schemas";
import { Core } from "../../../core";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleGetClassList(req: Request, res: Response) {
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

  logger.log("info", "Attempting to get class list...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `enrollments/schedule/get-class-list`.",
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

  const date = new Date(query.timeMs);
  const { payload: user } = auth;

  const queried = await classSchedService.getForTerm({
    values: {
      userId: user.id,
      date,
      termId: term.id,
    },
    role: user.role,
  });

  if (!queried.success) {
    const { error } = queried;

    logger.log("error", "Failed querying enrollments.", error);

    const message =
      error.name === "ENROLLMENT_DATA_NO_CLASS_LIST_ERROR"
        ? `This ${user.role}does not have any class for this term.`
        : internalErrMessage;

    return res.status(Core.Errors.EnrollmentData.getErrStatusCode(error)).json({
      success: false,
      message,
    });
  }

  return res.status(200).json({
    success: true,
    result: { classList: queried.result },
    message: "Success retrieving class list.",
  });
}
