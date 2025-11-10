import { Request, Response } from "express";
import { HashUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleVerifyCode(
  req: Request<{}, {}, Schemas.VerifyCode>,
  res: Response
) {
  const { body, authenticationService, requestLogger: logger } = req;
  const { email, code } = body;

  //    * verify user
  logger.log("debug", "Verifying user...");
  const verification = await authenticationService.authenticateUser({
    type: "session",
    identifier: email,
  });

  if (!verification.success) {
    //  ! failed verifying user
    const { error } = verification;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });

    const safeId = body.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
    const logMsg = `Failed sign-in attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return;
  }

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
    const message =
      error.name === "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR"
        ? "Something went wrong. Please try again later"
        : error.message; //  ? either could not find code or code is expired.

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  res.status(200).json({ successs: true, message: "Code verified." });
}
