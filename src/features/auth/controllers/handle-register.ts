import type { Request, Response } from "express";
import { RegisterSchemas } from "../schemas";
import { UserDataService } from "../services";

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
  const { type, schema } = parsedBody;
  const resolver = insertResolver[type];
  const userInsert = await resolver({ userDataService, schema } as never); //  * sidestep type mismatch

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

function getSchemaType<TObject extends RegisterSchemas.User>(object: TObject) {
  for (const [name, schema] of Object.entries(RegisterSchemas.dictionary)) {
    const parsedObject = schema.safeParse(object);

    const type = name as keyof typeof RegisterSchemas.dictionary;

    if (parsedObject.success)
      return { type, schema: parsedObject.data } as RegisterSchemas.Types;
  }

  throw new Error("Failed parsing Register Form Schema.");
}

type InsertResolverArgs<T extends RegisterSchemas.Types> = {
  userDataService: UserDataService;
  schema: T["schema"];
};

const insertResolver = {
  professor: async (
    args: InsertResolverArgs<{
      type: "professor";
      schema: RegisterSchemas.Professor;
    }>
  ) => {
    const schema = args.schema;
    return await args.userDataService.insertUser({
      type: "professor",
      user: schema,
      professor: schema,
    });
  },
  student: async (
    args: InsertResolverArgs<{
      type: "student";
      schema: RegisterSchemas.Student;
    }>
  ) => {
    const schema = args.schema;
    return await args.userDataService.insertUser({
      type: "student",
      user: schema,
      student: schema,
    });
  },
  user: async (
    args: InsertResolverArgs<{
      type: "user";
      schema: RegisterSchemas.User;
    }>
  ) => {
    const schema = args.schema;
    return await args.userDataService.insertUser({
      type: "user",
      user: schema,
    });
  },
};
