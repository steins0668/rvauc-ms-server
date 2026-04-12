import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { HashUtil } from "../../../../../utils";
import { Notifications } from "../../../../notifications";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleVerifyCode(
  req: Request<{}, {}, Schemas.VerifyCode>,
  res: Response,
) {
  const {
    body,
    requestLogger: logger,
    authenticationService,
    sessionManager,
    signInRequestService,
    userDataService,
  } = req;
  const { email, code, isPersistentAuth } = body;

  logger.log("info", "Verifying sign-in in code...");

  //    * verify user
  logger.log("debug", "Verifying user...");
  const authentication = await authenticationService.authenticate({
    type: "session",
    identifier: email,
  });

  if (!authentication.success) {
    const { error } = authentication;

    const safeId = body.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
    const logMsg = `Failed verification attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });
  }

  const { result: user } = authentication;

  //  * find non-expired request code with code (encrypt first) from body.
  logger.log("debug", "Verifying request code...");
  const codeHash = HashUtil.byCrypto(code);
  const codeVerification = await signInRequestService.verifyRequestCode(
    user.id,
    codeHash,
  );

  if (!codeVerification.success) {
    const { error } = codeVerification;
    const isInternalError =
      error.name === "AUTHENTICATION_SIGN_IN_REQUEST_CODE_QUERY_ERROR";

    const message = isInternalError
      ? "Something went wrong. Please try again later."
      : error.message; //  ? either could not find code or code is expired.

    logger.log("error", "Failed verifying code.", error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("debug", "Invalidating request code...");
  const codeInvalidation = await signInRequestService.invalidateRequest({
    requestId: codeVerification.result.id,
  });

  if (!codeInvalidation.success) {
    const { error } = codeInvalidation;
    logger.log("error", "Failed to invalidate request code.", error);

    const message = "Something went wrong. Please try again later.";
    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("debug", "Creating payloads...");
  const createAccessPayload = await Core.Utils.payloadResolver[user.role]({
    type: "full",
    dataService: userDataService,
    user,
  });

  if (!createAccessPayload.success) {
    const { error } = createAccessPayload;
    logger.log("debug", "Failed creating payload.", error);

    const message = "Something went wrong. Please try again later.";
    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  const sessionNumber = sessionManager.generateSessionNumber(user.id);
  logger.log("debug", "Creating tokens...");
  const tknCreation = Core.Utils.createTokens({
    type: "full",
    access: createAccessPayload.result,
    refresh: {
      sessionNumber,
      userId: user.id,
      isPersistentAuth,
      jti: randomUUID(),
    },
  });

  const internalErrMsg =
    "An error occurred while authenticating. Please try again later.";
  if (!tknCreation.success) {
    //  !failed creating tokens
    const { error } = tknCreation;
    logger.log("error", "Failed creating tokens.", error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });
  }

  logger.log("debug", "Starting session...");
  const { accessToken, refreshToken } = tknCreation.result;

  const persistentTokenExpiry = new Date();
  persistentTokenExpiry.setDate(persistentTokenExpiry.getDate() + 30);
  const sessionResult = await sessionManager.startSession({
    sessionNumber,
    userId: user.id,
    refreshToken,
    expiresAt: isPersistentAuth ? persistentTokenExpiry : null,
  });

  if (!sessionResult.success) {
    const { error } = sessionResult;
    logger.log("error", "Failed starting session.", error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });
  }

  const { refresh } = Core.Data.Cookie.config;
  const { cookieName, persistentCookie, sessionCookie } = refresh;

  logger.log("info", "Success verifying code. Signing in...");
  res.cookie(
    cookieName,
    refreshToken,
    isPersistentAuth ? persistentCookie : sessionCookie,
  );
  res
    .status(200)
    .json({ success: true, result: { accessToken, refreshToken } });
}
