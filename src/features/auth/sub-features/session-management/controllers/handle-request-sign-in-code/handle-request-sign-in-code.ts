import type { Request, Response } from "express";
import crypto from "crypto";
import { ResultBuilder } from "../../../../../../utils";
import { Notification } from "../../../../../notification";
import { Core } from "../../../../core";
import { Schemas } from "../../schemas";
import { getSignInMethod } from "./get-sign-in-method";

export async function handleRequestSignInCode(
  req: Request<{}, {}, Schemas.SignIn.Schema>,
  res: Response
) {
  const {
    body: authDetails,
    authenticationService,
    signInRequestService,
    requestLogger: logger,
  } = req;

  //  *validate and verify user credentials
  const verificationResult = await authenticationService.authenticate({
    type: "password",
    ...authDetails,
  });

  if (!verificationResult.success) {
    //  !authentication failed
    const { error } = verificationResult;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });

    const safeId = getSafeId(authDetails.identifier);
    const logMsg = `Failed sign-in attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return;
  }

  const { result: user } = verificationResult;

  //  * generate random sign-in code (6 digit)
  logger.log("debug", "Generating sign-in code...");
  const code = (crypto.randomBytes(4).readUint32BE(0) % 1000000)
    .toString()
    .padStart(6, "0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const codeCreation = await signInRequestService.storeNewRequest(
    user.id,
    codeHash
  );

  if (!codeCreation.success) {
    //  ! failed creating code
    const { error } = codeCreation;
    const message = "Failed generating sign-in code. Please try again later.";

    await notifyInternalError({ userId: user.id, message });

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  }

  //  * send request code to email
  logger.log("debug", "Sending sign-in code...");
  const emailTransport = await sendEmail({
    req,
    requestCode: code,
    email: user.email,
  });

  if (!emailTransport.success) {
    //  ! failed sending email
    //  * remove sign-in code from db
    const { id } = codeCreation.result;
    await signInRequestService.deleteRequestWhere({ filter: { id } });

    const { error } = emailTransport;

    const message = "Failed sending request code. Please try again later.";
    await notifyInternalError({ userId: user.id, message });
    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  }

  const message = "Request code sent. Please check your email.";
  await notify({
    category: "request_code_sent",
    userId: user.id,
    title: "Request Code",
    message,
  });
  res.status(200).json({
    success: true,
    message,
  });
}

async function sendEmail(args: {
  req: Request;
  requestCode: string;
  email: string;
}): Promise<
  | Core.Types.AuthenticationResult.Success<null>
  | Core.Types.AuthenticationResult.Fail
> {
  try {
    const { requestCode, email } = args;
    const subject = "Sign-in request received.";
    const text = `We have received a sign-in request. Please use the code below to sign-in.\n\n${requestCode}\n\nThis code will be valid for 10 minutes only.`;
    await Core.Utils.EmailTransports.sendEmail({
      to: email,
      subject,
      text,
    });
    return ResultBuilder.success(null);
  } catch (err) {
    return ResultBuilder.fail(
      Core.Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_SIGN_IN_REQUEST_EMAIL_ERROR",
        message: "Failed sending sign-in request code.",
        err,
      })
    );
  }
}

function getSafeId(identifier: string): string {
  const signInMethod = getSignInMethod(identifier);

  switch (signInMethod) {
    case "email":
      return identifier.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
    case "username":
      return identifier.slice(0, Math.min(8, identifier.length)) + "***";
    default:
      return JSON.stringify(identifier).slice(0, 50);
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
