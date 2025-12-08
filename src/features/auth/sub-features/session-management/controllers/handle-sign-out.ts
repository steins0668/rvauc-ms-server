import type { Request, Response } from "express";
import { Notifications } from "../../../../notifications";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleSignOut(
  req: Request<{}, {}, Schemas.Payloads.RefreshToken.Schema>,
  res: Response
) {
  const { requestLogger: logger, cookies, sessionManager } = req;

  logger.log("info", "Attempting to sign out...");

  const { refresh } = Core.Data.Cookie.config;
  const { cookieName: refreshCookie } = refresh;

  //  * helper function for clearing cookie
  const clearCookie = (cookieConfig: Core.Data.Cookie.Config) => {
    const { cookieName: refresh, clearCookie } = cookieConfig;
    logger.log("info", "Signed out successfully.");
    return res
      .clearCookie(refresh, clearCookie)
      .status(200)
      .json({ success: true, message: "Signed out successfully." });
  };

  //  * get refresh tkn
  const cookieToken = cookies?.[refreshCookie] as string | undefined;
  const bodyToken = req.body?.refreshToken;
  const refreshTkn = cookieToken ?? bodyToken;
  //  ! refresh tkn not found. just clear cookie
  if (refreshTkn === undefined) return clearCookie(refresh);

  //  * verify payload
  const payloadVerification = Core.Utils.verifyRefreshTkn(req, refreshTkn);
  //  ! payload not found, just clear cookie
  if (!payloadVerification.success) return clearCookie(refresh);

  //  * delete session
  const { sessionNumber } = payloadVerification.result;
  await sessionManager.endSession(sessionNumber);

  //  * clear cookie
  clearCookie(refresh);
}
