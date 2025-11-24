import type { Request, Response } from "express";
import { BaseResult } from "../../../../../types";
import { ResultBuilder } from "../../../../../utils";
import { Core } from "../../../core";
import { ViewModels } from "../../../types";
import { Schemas } from "../schemas";

export async function handleRefresh(
  req: Request<{}, {}, Schemas.Payloads.RefreshToken.Schema>,
  res: Response
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

  //  * get config for refresh cookie
  const cookieConfig = getRefreshConfig();
  if (!cookieConfig.success) {
    //  !failed getting refresh token config
    const { error } = cookieConfig;
    logger.log("error", "Failed getting refresh token config.", error);

    return res
      .status(Core.Errors.Config.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });
  }

  const { cookieName: refreshTknCookie } = cookieConfig.result;
  const cookieToken = cookies[refreshTknCookie] as string | undefined;
  const bodyToken = req.body?.refreshToken;
  const oldRefreshTkn = cookieToken ?? bodyToken;

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
    refresh: { sessionNumber, userId: user.id, isPersistentAuth },
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

  const { cookieName, persistentCookie, sessionCookie } = cookieConfig.result;

  logger.log("info", "Success refreshing tokens.");
  res.cookie(
    cookieName,
    refreshToken,
    isPersistentAuth ? persistentCookie : sessionCookie
  );
  res.json({ success: true, accessToken, refreshToken }); //  ! refresh token is for demo only
}

function getRefreshConfig():
  | BaseResult.Success<Core.Data.Token.CookieConfig>
  | BaseResult.Fail<Core.Errors.Config.ErrorClass> {
  const { cookieConfig: refreshCookie } = Core.Data.Token.configuration.refresh;

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
