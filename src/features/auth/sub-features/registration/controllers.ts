import type { Request, Response } from "express";
import { Schemas } from "./schemas";
import { Notifications } from "../../../notifications";

export namespace Controllers {
  export async function handleRegister(
    req: Request<{}, {}, Schemas.Register.RoleBased>,
    res: Response
  ) {
    const { body, requestLogger, userDataService } = req;

    requestLogger.log("info", "Attempting to register new user...");
    //  * check duplicates
    const duplicateCheck = await userDataService.ensureNoDuplicates(body);
    if (duplicateCheck.success && duplicateCheck.result.hasDuplicate) {
      const message = "User already exists.";

      requestLogger.log("info", message);
      return res.status(409).json({ success: false, message });
    }

    if (!duplicateCheck.success) {
      requestLogger.log(
        "error",
        "Failed checking for duplicates.",
        duplicateCheck.error
      );

      const message = "Error adding user. Please try again later.";
      return res.status(500).json({ success: false, message });
    }

    // * inserting user
    requestLogger.log("debug", "Inserting new user...");
    const userInsert = await userDataService.insertUser(body);

    if (userInsert.success) {
      const message = "User registration success.";

      if (body.deviceToken)
        await Notifications.Core.Services.Api.registerDevice({
          userId: userInsert.result!,
          deviceToken: body.deviceToken,
        });

      requestLogger.log("info", message);
      res.status(201).json({ success: true, message });
    } else {
      //  ! fail register
      requestLogger.log("error", "Registration failed.", userInsert.error);

      const message = "Something unexpected happened. Please try again later.";
      res.status(500).json({ success: false, message });
    }
  }
}
