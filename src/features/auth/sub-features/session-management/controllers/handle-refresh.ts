import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleRefresh(
  req: Request<{}, {}, Schemas.Payloads.RefreshToken.Schema>,
  res: Response,
) {
  const {
    requestLogger: logger,
    cookies,
    authenticationService,
    sessionManager,
    userDataService,
  } = req;

  const internalErrMsg =
    "An error occured while refreshing session. Please try again later.";

  logger.log("info", "Refreshing tokens...");

  const { refresh } = Core.Data.Cookie.config;
  const { cookieName: refreshTknCookie } = refresh;
  const cookieToken = cookies[refreshTknCookie] as string | undefined;
  const bodyToken = req.body?.refreshToken;
  const oldRefreshTkn = bodyToken ?? cookieToken;

  if (!oldRefreshTkn) {
    const message = "Refresh token is missing.";
    logger.log("debug", message);
    return res.status(401).json({ success: false, message });
  }

  logger.log("debug", "Verifying payload...");
  const payloadVerification = Core.Utils.verifyRefreshTkn(req, oldRefreshTkn);
  if (!payloadVerification.success) {
    //  !failed payload verification
    const { error } = payloadVerification;
    logger.log("error", "Failed verifying refresh token.", error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });
  }

  //  * get user with user id from payload
  const authentication = await authenticationService.authenticate({
    type: "session",
    identifier: payloadVerification.result.userId.toString(),
  });

  if (!authentication.success) {
    //  ! could not get user from db.
    const { error } = authentication;
    logger.log("error", "Failed retrieving user", error);

    return res.status(500).json({ success: false, message: internalErrMsg });
  }

  const { sessionNumber, isPersistentAuth } = payloadVerification.result;
  const { result: user } = authentication;

  logger.log("debug", "Creating payloads...");
  const createAccessPayload = await Core.Utils.payloadResolver[user.role]({
    type: "full",
    dataService: userDataService,
    user,
  });

  if (!createAccessPayload.success) {
    const { error } = createAccessPayload;
    logger.log("debug", "Failed creating payload", error);

    const message = "Something went wrong. Please try again later.";
    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("debug", "Creating new tokens...");
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

  if (!tknCreation.success) {
    const { error } = tknCreation;
    logger.log("error", "Failed creating tokens.", error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });
  }

  //  * token creation result
  const { accessToken, refreshToken } = tknCreation.result;

  logger.log("debug", "Rotating tokens...");
  const tknRotation = await sessionManager.rotateTokens({
    sessionNumber,
    oldToken: oldRefreshTkn,
    newToken: refreshToken,
  });

  if (!tknRotation.success) {
    const { error } = tknRotation;

    logger.log("error", "Failed rotating tokens.", error);

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });
  }

  const { cookieName, persistentCookie, sessionCookie } = refresh;

  logger.log("info", "Success refreshing tokens.");
  res.cookie(
    cookieName,
    refreshToken,
    isPersistentAuth ? persistentCookie : sessionCookie,
  );
  res
    .status(200)
    .json({ success: true, result: { accessToken, refreshToken } }); //  ! refresh token is for demo only
}
