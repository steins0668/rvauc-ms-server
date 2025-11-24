import { Request, Response } from "express";
import crypto from "crypto";
import { ResultBuilder } from "../../../../../utils";
import { Notifications } from "../../../../notifications";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleForgotPassword(
  req: Request<{}, {}, Schemas.ForgotPassword>,
  res: Response
) {
  const { body, authenticationService, requestLogger: logger } = req;

  logger.log("info", "Attempting to send reset code...");

  //  * get user based on POST email
  logger.log("debug", "Verifying user...");
  const verification = await authenticationService.authenticate({
    type: "session",
    identifier: body.email,
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

  const user = verification.result;

  //  * verify if no active reset code exists
  logger.log("debug", "Verifying if no active reset codes exist.");
  const activeCodeVerification =
    await req.passwordManagementService.verifyNoActiveCode(user.id);

  if (!activeCodeVerification.success) {
    //  ! failed querying the database
    const { error } = activeCodeVerification;
    logger.log("error", "Failed verifying active codes", error);

    await notifyInternalError({ userId: user.id });

    const message = "Something went wrong. Please try again later.";
    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  } else if (!activeCodeVerification.result) {
    logger.log("info", "Active code still exists.");
    return res
      .status(403) // ! Forbidden. Active code still exists.
      .json({
        success: false,
        message:
          "You still have an active request. Please try again in 10 minutes.",
      });
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
    logger.log("error", "Failed generating reset code.", error);

    const message = "Failed generating reset code. Please try again later.";

    await notifyInternalError({ userId: user.id, message });

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("debug", "Sending reset code to email...");
  const emailTransport = await sendEmail({
    resetCode: code,
    email: user.email,
  });

  if (!emailTransport.success) {
    const { error } = emailTransport;
    logger.log("error", "Failed sending reset code to email.", error);

    logger.log("debug", "Removing reset code from db...");
    const { id } = codeCreation.result;
    await req.passwordManagementService.deleteCodeWhere({ filter: { id } });

    const message = "Failed sending reset code. Please try again later.";

    await notifyInternalError({ userId: user.id, message });

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("info", "Reset code successfuly sent to email.");

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
  notification: Notifications.Core.Schemas.NewNotification
) => Notifications.Core.Services.Api.pushNotification(notification);
//#endregion
