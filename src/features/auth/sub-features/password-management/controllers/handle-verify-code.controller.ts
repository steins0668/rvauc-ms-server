import { Request, Response } from "express";
import { HashUtil } from "../../../../../utils";
import { Notification } from "../../../../notification";
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
  const verification = await authenticationService.authenticate({
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
    const isInternalError =
      error.name === "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR";
    const message = isInternalError
      ? "Something went wrong. Please try again later"
      : error.message; //  ? either could not find code or code is expired.

    const notification = isInternalError
      ? notifyInternalError({ userId: user.id })
      : notify({
          category: "password_code_not_verified",
          userId: user.id,
          title: "Failed verification.",
          message,
        });

    await notification;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  const message = "Code verified.";

  await notify({
    category: "password_code_verified",
    userId: user.id,
    title: "Code verification",
    message,
  });

  res.status(200).json({ success: true, message });
}

const notifyInternalError = async (args: {
  userId: number;
  message?: string;
}) =>
  notify({
    category: "internal_error",
    userId: args.userId,
    title: "Internal error.",
    message: args.message ?? "Something went wrong. Please try again later.",
  });

const notify = async (
  notification: Notification.Core.Schemas.NewNotification
) => Notification.Core.Services.Api.pushNotification(notification);
