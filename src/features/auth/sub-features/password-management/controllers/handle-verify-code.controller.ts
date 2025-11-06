import { Request, Response } from "express";
import { HashUtil, ResultBuilder } from "../../../../../utils";
import { Core } from "../../../core";
import { Schemas } from "../schemas";

export async function handleVerifyCode(
  req: Request<{}, {}, Schemas.VerifyCode>,
  res: Response
) {
  const { body, requestLogger: logger, userDataService } = req;
  const { email, code } = body;

  //    * verify user
  logger.log("debug", "Verifying user...");
  const verification = await verifyUser({ userDataService, email });

  if (!verification.success) {
    //  ! failed verifying user
    const { error } = verification;

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });

    const safeId = body.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
    const logMsg = `Failed sign-in attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return;
  }

  const user = verification.result;

  //    * find non-expired reset code with code (encrypt first) from body.
  logger.log("debug", "Verifying reset code...");
  const codeHash = HashUtil.byCrypto(code);
  const codeVerification = await req.passwordManagementService.verifyResetCode(
    codeHash
  );

  if (!codeVerification.success) {
    //  ! code verification failed
    const { error } = codeVerification;
    const message =
      error.name === "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR"
        ? "Something went wrong. Please try again later"
        : error.message; //  ? either could not find code or code is expired.

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  res.status(200).json({ successs: true, message: "Code verified." });
}
//#region Utils
async function verifyUser(args: {
  email: string;
  userDataService: Core.Services.UserData.Service;
}) {
  const query = await args.userDataService.queryUsers({
    fn: async (query, converter) => {
      const { email } = args;
      return await query.findFirst({
        where: converter({ email }),
      });
    },
  });

  if (query.success) return query;

  return ResultBuilder.fail(
    Core.Errors.Authentication.normalizeError({
      name: "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR",
      message: "Could not find user.",
      err: query.error,
    })
  );
}
//#endregion
