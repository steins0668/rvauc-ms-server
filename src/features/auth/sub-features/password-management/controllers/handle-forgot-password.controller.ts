import { Request, Response } from "express";
import crypto from "crypto";
import { ResultBuilder } from "../../../../../utils";
import { Notification } from "../../../../notification";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleForgotPassword(
  req: Request<{}, {}, Schemas.ForgotPassword>,
  res: Response
) {
  const { body, authenticationService, requestLogger: logger } = req;
  //  * get user based on POST email
  logger.log("debug", "Verifying user...");
  const verification = await authenticationService.authenticate({
    type: "session",
    identifier: body.email,
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

  //  * verify if no active reset code exists
  logger.log("debug", "Verifying if no active reset codes exist.");
  const activeCodeVerification =
    await req.passwordManagementService.verifyNoActiveCode(user.id);

  if (!activeCodeVerification.success) {
    //  ! failed querying the database
    const { error } = activeCodeVerification;
    const message = "Something went wrong. Please try again later.";

    await notifyInternalError({ userId: user.id });

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  } else if (!activeCodeVerification.result) {
    //  ! active reset code exists
    res
      .status(403) // ! Forbidden. Active code still exists.
      .json({
        success: false,
        message:
          "You still have an active request. Please try again in 10 minutes.",
      });

    logger.log("debug", "Active code still exists.");

    return;
  }

  //  * generate random reset code (6 digit)
  logger.log("debug", "Generating reset code...");
  const code = (crypto.randomBytes(4).readUint32BE(0) % 1000000)
    .toString()
    .padStart(6, "0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const codeCreation = await req.passwordManagementService.storeNewCode(
    user.id,
    codeHash
  );

  if (!codeCreation.success) {
    //  ! failed creating code
    const { error } = codeCreation;
    const message = "Failed generating reset code. Please try again later.";

    await notifyInternalError({ userId: user.id, message });

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  }

  //  * send reset code to email
  logger.log("debug", "Sending reset code...");
  const emailTransport = await sendEmail({
    req,
    resetCode: code,
    email: user.email,
  });

  if (!emailTransport.success) {
    //  ! failed sending email
    //  * remove reset code from db
    const { id } = codeCreation.result;
    await req.passwordManagementService.deleteCodeWhere({ filter: { id } });

    const { error } = emailTransport;

    const message = "Failed sending reset code. Please try again later.";

    await notifyInternalError({ userId: user.id, message });

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  }

  const message = "Reset password code sent. Please check your email.";

  await notify({
    category: "password_code_sent",
    userId: user.id,
    title: "Password code sent.",
    message,
  });
  res.status(200).json({ success: true, message });
}
//#region Utils
async function sendEmail(args: {
  req: Request<{}, {}, Schemas.ForgotPassword>;
  resetCode: string;
  email: string;
}): Promise<
  | Core.Types.AuthenticationResult.Success<null>
  | Core.Types.AuthenticationResult.Fail
> {
  try {
    const { resetCode, email } = args;
    const subject = "Password change request received.";
    const text = `We have received a password reset request. Please use the code below to reset your password\n\n${resetCode}\n\nThis code will be valid for 10 minutes only.`;
    await Core.Utils.EmailTransports.sendEmail({
      to: email,
      subject,
      text,
    });
    return ResultBuilder.success(null);
  } catch (err) {
    return ResultBuilder.fail(
      Core.Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_PASSWORD_RESET_EMAIL_ERROR",
        message: "Failed sending reset code.",
        err,
      })
    );
  }
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
  notification: Notification.Core.Schemas.PushNotification
) => Notification.Core.Services.Api.pushNotification(notification);
//#endregion
