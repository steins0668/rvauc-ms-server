import type { Request, Response } from "express";
import { Notification } from "../../../../notification";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleSignOut(
  req: Request<{}, {}, Schemas.Payloads.RefreshToken.Schema>,
  res: Response
) {
  const { requestLogger: logger, cookies, sessionManager } = req;

  const internalErrMsg =
    "An error occured while signing out session. Please try again later.";

  //  * get config for refresh token cookie
  const cookieConfig = Core.Utils.Config.getRefreshConfig();
  if (!cookieConfig.success) {
    //  !failed getting refresh token config
    const { error } = cookieConfig;

    res
      .status(Core.Errors.Config.getErrStatusCode(error))
      .json({ success: false, message: internalErrMsg });

    logger.log("error", "Failed getting refresh token config.", error);

    return;
  }

  const { cookieName: refresh } = cookieConfig.result;

  //  * helper function for clearing cookie
  const clearCookie = (cookieConfig: Core.Data.Token.CookieConfig) => {
    const { cookieName: refresh, clearCookie } = cookieConfig;
    res
      .clearCookie(refresh, clearCookie)
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  };

  //  * get refresh tkn
  const cookieToken = cookies?.[refresh] as string | undefined;
  const bodyToken = req.body?.refreshToken;
  const refreshTkn = cookieToken ?? bodyToken;
  //  ! refresh tkn not found. just clear cookie
  if (refreshTkn === undefined) return clearCookie(cookieConfig.result);

  //  * verify payload
  const payloadVerification = Core.Utils.verifyRefreshTkn(req, refreshTkn);
  //  ! payload not found, just clear cookie
  if (!payloadVerification.success) return clearCookie(cookieConfig.result);

  //  * delete session
  const { sessionNumber } = payloadVerification.result;
  await sessionManager.endSession(sessionNumber);

  await notify({
    category: "sign_out_success",
    userId: payloadVerification.result.userId,
    title: "Sign Out",
    message: "Signed out successfully.",
  });

  //  * clear cookie
  clearCookie(cookieConfig.result);
}

const notify = async (
  notification: Notification.Core.Schemas.PushNotification
) => Notification.Core.Services.Api.pushNotification(notification);
