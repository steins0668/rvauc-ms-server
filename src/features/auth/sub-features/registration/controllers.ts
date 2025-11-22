import type { Request, Response } from "express";
import { Schemas } from "./schemas";
import { Notifications } from "../../../notifications";

export namespace Controllers {
  export async function handleRegister(
    req: Request<{}, {}, Schemas.Register.RoleBased>,
    res: Response
  ) {
    const { body, requestLogger, userDataService } = req;

    //  * check duplicates
    const duplicateCheck = await userDataService.ensureNoDuplicates(body);

    if (duplicateCheck.success && duplicateCheck.result.hasDuplicate) {
      const message = "User already exists.";

      requestLogger.log("debug", message);
      res.status(409).json({ success: false, message });
      return;
    }

    if (!duplicateCheck.success) {
      const { message: logMsg } = duplicateCheck.error;
      requestLogger.log("error", logMsg, duplicateCheck.error);

      const resMsg = "Error adding user. Please try again later.";
      res.status(500).json({ success: false, message: resMsg });
    }

    // * inserting user
    requestLogger.log("debug", "Inserting new user...");
    const userInsert = await userDataService.insertUser(body);

    if (userInsert.success) {
      //  * success register
      const message = "User registration success.";

      if (body.deviceToken)
        await Notifications.Core.Services.Api.registerDevice({
          userId: userInsert.result!,
          deviceToken: body.deviceToken,
        });

      requestLogger.log("debug", message);
      res.status(201).json({ success: true, message });
    } else {
      //  ! fail register
      const { message: logMsg } = userInsert.error;
      requestLogger.log("error", logMsg, userInsert.error);

      const resMsg = "Database error. Please try again later.";
      res.status(500).json({ success: false, message: resMsg });
    }
  }
}
