import type { Request, Response } from "express";
import { BaseResult } from "../../../../../types";
import { ResultBuilder } from "../../../../../utils";
import { Core } from "../../../core";
import { ViewModels } from "../../../types";
import { CustomError } from "../error";
import { Data } from "../data";
import { Utils } from "../utils";
import { Schemas } from "../schemas";

export async function handleRefresh(
  req: Request<{}, {}, Schemas.Payloads.RefreshToken.Schema>,
  res: Response
) {
  const {
    requestLogger: logger,
    cookies,
    sessionManager,
    userDataService,
  } = req;

  const internalErrMsg =
    "An error occured while refreshing session. Please try again later.";

  //  * get config for refresh cookie
  const cookieConfig = getRefreshConfig();
  if (!cookieConfig.success) {
    //  !failed getting refresh token config
    const { error } = cookieConfig;

    res
      .status(CustomError.Config.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed getting refresh token config.", error);

    return;
  }

  const { cookieName: refreshTknCookie } = cookieConfig.result;
  const cookieToken = cookies[refreshTknCookie] as string | undefined;
  const bodyToken = req.body.refreshToken;
  const oldRefreshTkn = cookieToken ?? bodyToken;

  if (!oldRefreshTkn) {
    const message = "Refresh token is missing.";
    res.status(401).json({ success: false, message });

    req.requestLogger.log("debug", message);
    return;
  }

  //  * verify payload
  const payloadVerification = Utils.verifyRefreshTkn(req, oldRefreshTkn);
  if (!payloadVerification.success) {
    //  !failed payload verification
    const { error } = payloadVerification;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });

    logger.log("error", "Failed verifying refresh token.", error);

    return;
  }

  //  * get user with user id from payload
  const userQuery = await resolveUser(req, payloadVerification.result.userId);

  if (!userQuery.success) {
    //  ! could not get user from db.
    res.status(500).json({ success: false, message: internalErrMsg });

    const { error } = userQuery;
    logger.log("error", "Failed retrieving user", error);
    return;
  }

  const { sessionNumber, isPersistentAuth } = payloadVerification.result;

  //  * create new tokens
  const tknCreation = await Utils.createTokens({
    userDataService,
    verifiedUser: userQuery.result,
    sessionNumber,
    isPersistentAuth,
  });

  if (!tknCreation.success) {
    //  !failed creating tokens
    const { error } = tknCreation;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed creating tokens.", error);

    return;
  }

  //  * token creation result
  const { accessToken, refreshToken } = tknCreation.result;

  //  * rotate tokens in session.
  const tknRotation = await sessionManager.rotateTokens({
    sessionNumber,
    oldToken: oldRefreshTkn,
    newToken: refreshToken,
  });

  if (!tknRotation.success) {
    //  !failed rotating tokens
    const { error } = tknRotation;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed rotating tokens.", error);

    return;
  }

  const { cookieName, persistentCookie, sessionCookie } = cookieConfig.result;

  //  * create cookie and json for access token
  res.cookie(
    cookieName,
    refreshToken,
    isPersistentAuth ? persistentCookie : sessionCookie
  );
  res.json({ success: true, accessToken, refreshToken }); //  ! refresh token is for demo only
}

function getRefreshConfig():
  | BaseResult.Success<Data.Token.CookieConfig>
  | BaseResult.Fail<CustomError.Config.ErrorClass> {
  const { cookieConfig: refreshCookie } = Data.Token.configuration.refresh;

  if (!refreshCookie)
    //  cookie config not set
    return ResultBuilder.fail({
      name: "AUTH_CONFIG_COOKIE_CONFIG_ERROR",
      message: "Refresh token cookie is not configured properly.",
    });

  return ResultBuilder.success(refreshCookie);
}

async function resolveUser(
  req: Request,
  id: number
): Promise<
  | Core.Types.AuthenticationResult.Success<ViewModels.User>
  | Core.Types.AuthenticationResult.Fail
> {
  const { userDataService } = req;

  const userQuery = await userDataService.queryUsers({
    fn: async (query, converter) => {
      return await query.findFirst({ where: converter({ id }) });
    },
  });

  if (userQuery.success && userQuery.result)
    return ResultBuilder.success(
      userQuery.result,
      "AUTHENTICATION_SESSION_TOKEN_VERIFY"
    );

  //  !user query fails or user query result is undefined
  return ResultBuilder.fail(
    Core.Errors.Authentication.normalizeError({
      name: "AUTHENTICATION_SESSION_TOKEN_MALFORMED_ERROR",
      message: "Failed retrieving user details.",
      err: !userQuery.success ? userQuery.error : undefined,
    })
  );
}
