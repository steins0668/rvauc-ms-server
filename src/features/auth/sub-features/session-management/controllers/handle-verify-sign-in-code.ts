import { Request, Response } from "express";
import { HashUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleVerifySignInCode(
  req: Request<{}, {}, Schemas.VerifyCode>,
  res: Response
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
    const logMsg = `Failed verification attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return;
  }

  //  * find non-expired request code with code (encrypt first) from body.
  logger.log("debug", "Verifying request code...");
  const codeHash = HashUtil.byCrypto(code);
  const codeVerification = await signInRequestService.verifyRequestCode(
    codeHash
  );

  if (!codeVerification.success) {
    //  ! code verification failed
    const { error } = codeVerification;
    const message =
      error.name === "AUTHENTICATION_SIGN_IN_REQUEST_CODE_QUERY_ERROR"
        ? "Something went wrong. Please try again later."
        : error.message; //  ? either could not find code or code is expired.

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  //  * invalidate request verified request code.
  const codeInvalidation = await signInRequestService.invalidateRequest({
    requestId: codeVerification.result.id,
  });

  if (!codeInvalidation.success) {
    const { error } = codeInvalidation;
    const message = "Something went wrong. Please try again later.";

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  //  *start session creation
  const { result: user } = verification;
  const sessionNumber = sessionManager.generateSessionNumber(user.id);

  //  *create tokens
  const tokenResult = await Core.Utils.createTokens({
    userDataService,
    verifiedUser: user,
    sessionNumber,
    isPersistentAuth,
  });

  const internalErrMsg =
    "An error occurred while authenticating. Please try again later.";
  if (!tokenResult.success) {
    //  !failed creating tokens
    const { error } = tokenResult;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed creating tokens.", error);

    return;
  }
  //  *start session
  const { accessToken, refreshToken } = tokenResult.result;

  const persistentTokenExpiry = new Date();
  persistentTokenExpiry.setDate(persistentTokenExpiry.getDate() + 30);
  const sessionResult = await sessionManager.startSession({
    sessionNumber,
    userId: user.id,
    refreshToken,
    expiresAt: isPersistentAuth ? persistentTokenExpiry : null,
  });

  if (!sessionResult.success) {
    //  !failed starting session
    const { error } = sessionResult;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed starting session.", error);
    return;
  }

  const cookieResult = Core.Utils.Config.getRefreshConfig();

  if (!cookieResult.success) {
    //  !failed getting refresh token config
    const { error } = cookieResult;

    res
      .status(Core.Errors.Config.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed getting refresh token config.", error);

    return;
  }

  const { cookieName, persistentCookie, sessionCookie } = cookieResult.result;

  //  *cookie creation
  res.cookie(
    cookieName,
    refreshToken,
    isPersistentAuth ? persistentCookie : sessionCookie
  );
  res.json({ success: true, accessToken, refreshToken });
}
