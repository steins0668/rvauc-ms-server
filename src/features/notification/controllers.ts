import { Request, Response } from "express";
import { Auth } from "../auth";
import { Core } from "./core";

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

    const { id: userId } = auth.payload;

    requestLogger.log("info", "Retrieving notifications...");
    const retrieved = await Core.Services.Api.getNotifications({ userId });

    if (!retrieved.success) {
      const { error } = retrieved;
      requestLogger.log("error", "Failed to get notifications", error);

      return res.status(500).json({
        success: false,
        message: "Failed retrieving notifications for user.",
      });
    }

    requestLogger.log("info", "Success getting notifications.");

    res.status(200).json({
      success: true,
      result: retrieved.result,
    });
  }
}
