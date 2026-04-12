import type { Request, Response } from "express";
import crypto from "crypto";
import { ENV } from "../../../../../../data";
import { Json, ResultBuilder } from "../../../../../../utils";
import { Notifications } from "../../../../../notifications";
import { Core } from "../../../../core";
import { Schemas } from "../../schemas";
import { getSignInMethod } from "./get-sign-in-method";

export async function handleRequestSignInCode(
  req: Request<{}, {}, Schemas.SignIn.Schema>,
  res: Response,
) {
  const {
    body: authDetails,
    authenticationService,
    signInRequestService,
    requestLogger: logger,
  } = req;

  logger.log("info", "Requesting sign-in code...");

  //  *validate and verify user credentials
  logger.log("debug", "Verifying user...");
  const verificationResult = await authenticationService.authenticate({
    type: "password",
    ...authDetails,
  });

  if (!verificationResult.success) {
    const { error } = verificationResult;
    const safeId = getSafeId(authDetails.identifier);
    const logMsg = `Failed sign-in attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });
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
    codeHash,
  );

  if (!codeCreation.success) {
    //  ! failed creating code
    const { error } = codeCreation;
    logger.log("error", "Failed generating sign-in code.", error);

    const message = "Failed generating sign-in code. Please try again later.";

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("debug", "Sending sign-in code to email...");
  const emailTransport = await sendEmail({
    req,
    requestCode: code,
    email: user.email,
  });

  if (!emailTransport.success) {
    //  ! failed sending email
    const { error } = emailTransport;
    logger.log("error", "Failed sending email.", error);

    logger.log("debug", "Removing sign-in code from db...");
    const { id } = codeCreation.result;
    await signInRequestService.deleteRequestWhere({ filter: { id } });

    const message = "Failed sending request code. Please try again later.";
    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  if (authDetails.deviceToken) {
    logger.log("debug", "Registering device token...");
    await Notifications.Core.Services.Api.registerDevice({
      userId: user.id,
      deviceToken: authDetails.deviceToken,
    });
  }

  logger.log("info", "Successs sending code to email.");

  const message = "Request code sent. Please check your email.";
  res.status(200).json({
    success: true,
    result: { email: user.email },
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
    const text = `We have received a sign-in request. Please use the code below to sign-in.\n\n${requestCode}\n\nThis code will be valid for 1 minute only.`;
    await Core.Utils.Mailer.send({
      to: email,
      subject,
      text,
    });

    const env = ENV.getEnvironment();

    //  todo: remove this. temporary
    if (env === "dev" || env === "testing")
      await Json.write({ fileName: "codes.json", data: { code: requestCode } });

    return ResultBuilder.success(null);
  } catch (err) {
    return ResultBuilder.fail(
      Core.Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_SIGN_IN_REQUEST_EMAIL_ERROR",
        message: "Failed sending sign-in request code.",
        err,
      }),
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
