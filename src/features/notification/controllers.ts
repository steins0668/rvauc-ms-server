import { Request, Response } from "express";
import { Auth } from "../auth";

export namespace Controllers {
  export async function handleGetNotifications(req: Request, res: Response) {
    const { auth, requestLogger } = req;

    const isAllowed = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

    if (!isAllowed) {
      requestLogger.log(
        "error",
        "Invalid payload attempted to access `notifications/get-notifications`."
      );

      return res.status(401).json({
        success: false,
        message: "You are not allowed to access this resource.",
      });
    }

    const { payload } = auth;
  }
}
