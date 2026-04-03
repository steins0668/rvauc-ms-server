import { Request, Response } from "express";
import { StrictValidatedRequest } from "../../../../../interfaces";
import { Clock } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Schemas } from "../schemas";
import { Core } from "../../../core";

const internalErrMessage = "Something went wrong. Please try again later.";

export async function handleSubmitRecords(req: Request, res: Response) {
  const {
    auth,
    validated: { params, body },
    classSchedService,
    attendanceRegistrationService,
    termDataService,
    requestLogger: logger,
  } = req as StrictValidatedRequest<
    Schemas.RequestParams.ClassId & Schemas.RequestParams.ClassOfferingId,
    {},
    Schemas.RequestBody.RecordSubmission,
    {}
  >;

  logger.log("info", "Attempting to update attendance record...");
  //  * authorize user
  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload || auth.payload.role !== "professor") {
    logger.log(
      "info",
      "Invalid payload attempted to access UPDATE `enrollments/attendance/record`.",
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

  const classQuery = await classSchedService.getForNow({
    date: body.date,
    role: auth.payload.role,
    termId: term.id,
    userId: auth.payload.id,
  });

  if (!classQuery.success) {
    const { error } = classQuery;

    logger.log("error", "Failed querying classes.", error);

    const message =
      error.name === "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR"
        ? `The ${auth.payload.role} does not have any active classes for this date.`
        : internalErrMessage;

    return res.status(Core.Errors.EnrollmentData.getErrStatusCode(error)).json({
      success: false,
      message,
    });
  }

  logger.log("debug", "Attempting to update records...");
  const tx = await attendanceRegistrationService.mutateRecords({
    classDto: classQuery.result,
    values: {
      classId: params.classId,
      classOfferingId: params.classOfferingId,
      currentDate: Clock.now(),
      professorId: auth.payload.id,
      records: body.records,
    },
  });

  if (!tx.success) {
    const { error } = tx;

    logger.log("error", "Failed updating attendance records.", error);

    return res
      .status(500)
      .json({ success: false, message: internalErrMessage });
  }

  logger.log("info", "Success updating attendance records");
  return res.status(200).json({
    success: true,
    result: { records: tx.result },
    message: "Attendance records updated.",
  });
}
