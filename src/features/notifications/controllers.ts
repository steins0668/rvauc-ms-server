import { Request, Response } from "express";
import { Auth } from "../auth";
import { Core } from "./core";

export namespace Controllers {
  export async function handleGetNotifications(req: Request, res: Response) {
    const { auth, requestLogger } = req;

    const isAllowed = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

    if (!isAllowed) {
      requestLogger.log("info", "Invalid payload attempted to access route.");

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

  export async function handleClearNotifications(req: Request, res: Response) {
    const { auth, requestLogger } = req;

    const isAllowed = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

    if (!isAllowed) {
      requestLogger.log("info", "Invalid payload attempted to access route.");

      return res.status(401).json({
        success: false,
        message: "You are not allowed to access this resource.",
      });
    }

    const { id: userId } = auth.payload;

    requestLogger.log("info", "Clearing notifications...");
    const cleared = await Core.Services.Api.clearNotifications({ userId });

    if (!cleared.success) {
      const { error } = cleared;
      requestLogger.log("error", "Failed to clear notifications", error);

      return res.status(500).json({
        success: false,
        message: "Failed clearing notifications for user.",
      });
    }

    requestLogger.log("info", "Success clearing notifications.");

    res.status(200).json({
      success: true,
      message: cleared.result,
    });
  }
}
