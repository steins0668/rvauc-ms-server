import { Request, Response } from "express";
import { HashUtil } from "../../../../../utils";
import { Notifications } from "../../../../notifications";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleVerifyCode(
  req: Request<{}, {}, Schemas.VerifyCode>,
  res: Response
) {
  const { body, authenticationService, requestLogger: logger } = req;
  const { email, code } = body;

  logger.log("info", "Verifying code...");

  //    * verify user
  logger.log("debug", "Verifying user...");
  const verification = await authenticationService.authenticate({
    type: "session",
    identifier: email,
  });

  if (!verification.success) {
    //  ! failed verifying user
    const { error } = verification;

    const safeId = body.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
    const logMsg = `Failed sign-in attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });
  }

  //  todo: verify with user id
  const user = verification.result;

  //    * find non-expired reset code with code (encrypt first) from body.
  logger.log("debug", "Verifying reset code...");
  const codeHash = HashUtil.byCrypto(code);
  const codeVerification = await req.passwordManagementService.verifyResetCode(
    codeHash
  );

  if (!codeVerification.success) {
    //  ! code verification failed
    const { error } = codeVerification;
    logger.log("error", "Failed verifying code.", error);

    const isInternalError =
      error.name === "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR";
    const message = isInternalError
      ? "Something went wrong. Please try again later"
      : error.message; //  ? either could not find code or code is expired.

    const notification = isInternalError;

    await notification;

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("info", "Success verifying code.");

  const message = "Code verified.";

  res.status(200).json({ success: true, message });
}
