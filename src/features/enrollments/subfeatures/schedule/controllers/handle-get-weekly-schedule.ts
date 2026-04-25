import { Request, Response } from "express";
import { StrictValidatedRequest } from "../../../../../interfaces";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleGetWeeklySchedule(req: Request, res: Response) {
  const {
    auth,
    validated: { params },
    classSchedService,
    requestLogger: logger,
  } = req as StrictValidatedRequest<Schemas.RequestParams.ClassId>;

  logger.log("info", "Attempting to get schedule...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
    logger.log("info", "Invalid payload attempted to access route.");

    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  const { payload: user } = auth;

  const schedule = await classSchedService.getWeekly({
    values: { classId: params.classId, userId: user.id },
    role: user.role,
  });

  if (!schedule.success) {
    const { error } = schedule;
    const { message } = error;

    logger.log("error", "Failed retrieving schedule.", error);

    const status = Core.Errors.EnrollmentData.getErrStatusCode(error);

    return res.status(status).json({ success: false, message });
  }

  return res.status(200).json({
    success: true,
    result: schedule.result,
    message: "Success retrieving schedule.",
  });
}
