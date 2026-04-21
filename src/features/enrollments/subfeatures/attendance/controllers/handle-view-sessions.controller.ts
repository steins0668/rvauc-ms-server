import { Request, Response } from "express";
import { StrictValidatedRequest } from "../../../../../interfaces";
import { Clock } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Schemas } from "../schemas";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleViewSessions(req: Request, res: Response) {
  const {
    auth,
    validated: { params },
    classSessionDataService,
    termDataService,
    requestLogger: logger,
  } = req as StrictValidatedRequest<Schemas.RequestParams.ClassId>;

  logger.log("info", "Attempting to retrieve class sessions...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload || auth.payload.role !== "professor") {
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

  logger.log("debug", "Attempting to get class sessions...");
  const queried = await classSessionDataService.getAllSessionsUntilDate({
    values: {
      date: Clock.now(new Date()),
      classId: params.classId,
      professorId: auth.payload.id,
      termId: term.id,
    },
  });

  if (!queried.success) {
    const { error } = queried;

    logger.log("error", "Failed retrieving class sessions.", error);

    return res
      .status(500)
      .json({ success: false, message: internalErrMessage });
  }

  logger.log("info", "Success retrieving class sessions");
  return res.status(200).json({
    success: true,
    result: queried.result,
    message: "Class sessions retrieved.",
  });
}
