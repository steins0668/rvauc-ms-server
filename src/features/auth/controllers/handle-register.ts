import type { Request, Response } from "express";
import { RegisterSchemas } from "../schemas";

export async function handleRegister(
  req: Request<{}, {}, RegisterSchemas.Base>,
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
    console.log(`Inserted from ${userInsert.source}`);
    //  * success register
    const message = "User registration success.";

    requestLogger.log("debug", message);
    res.status(201).json({ success: true, message });
  } else {
    //  ! fail register
    const { message: logMsg } = userInsert.error;
    requestLogger.log("error", logMsg, userInsert.error);

    const resMsg = "Database error. Please try again later.";
    res.status(500).json({ success: false, message: resMsg });
  }

  return;
}
