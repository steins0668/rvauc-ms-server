import type { Request, Response } from "express";
import { RegisterSchemas } from "../schemas";

export async function handleRegister<TBody extends RegisterSchemas.User>(
  req: Request<{}, {}, TBody>,
  res: Response
) {
  const { body, requestLogger, userDataService } = req;

  //  * check duplicates
  const parsedBody = getSchemaType<TBody>(body);
  const duplicateCheck = await userDataService.ensureNoDuplicates(parsedBody);

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
  const userInsert = await insertUser<TBody>(req, parsedBody);

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
    res.status(500).json({ success: true, message: resMsg });
  }

  return;
}

async function insertUser<TBody extends RegisterSchemas.User>(
  req: Request<{}, {}, TBody>,
  parsedBody: RegisterSchemas.Types
) {
  const { userDataService } = req;
  const { type, schema } = parsedBody;

  //  * the register schemas themselves inherit the fields of the insert model.
  //  * the professor and student schema extends the user schema
  switch (type) {
    case "professor":
      return await userDataService.insertUser({ type, user: schema });
    case "student":
      return await userDataService.insertUser({
        type,
        user: schema,
        student: schema,
      });
    case "user":
      return await userDataService.insertUser({ type, user: schema });
    default:
      throw new Error("Invalid Register Form Schema.");
  }
}

function getSchemaType<TObject extends RegisterSchemas.User>(object: TObject) {
  for (const [name, schema] of Object.entries(RegisterSchemas.dictionary)) {
    const parsedObject = schema.safeParse(object);

    const type = name as keyof typeof RegisterSchemas.dictionary;

    if (parsedObject.success)
      return { type, schema: parsedObject.data } as RegisterSchemas.Types;
  }

  throw new Error("Failed parsing Register Form Schema.");
}
