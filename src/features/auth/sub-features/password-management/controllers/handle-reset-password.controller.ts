import { Request, Response } from "express";
import { execTransaction } from "../../../../../db/create-context";
import { HashUtil, ResultBuilder } from "../../../../../utils";
import { Core } from "../../../core";
import { ViewModels } from "../../../types";
import { Schemas } from "../schemas";

export async function handleResetPassword(
  req: Request<{ code: string }, {}, Schemas.ResetPassword>,
  res: Response
) {
  const { body, requestLogger: logger } = req;
  const { password, confirmPassword } = body;

  logger.log("debug", "Resetting password...");

  //    get password and confirm password from req body
  if (password !== confirmPassword) {
    res
      .status(403) // * forbidden
      .json({
        success: false,
        message:
          "Password and confirm password fields do not match. Please try again.",
      });

    logger.log("debug", "Password and confirm password mismatch.");
    return;
  }

  //    *   find non-expired reset code with code (encrypt first) from req params
  logger.log("debug", "Finding reset code in db...");
  const codeHash = HashUtil.byCrypto(req.params.code);
  const codeVerification = await req.passwordManagementService.verifyResetCode(
    codeHash
  );

  if (!codeVerification.success) {
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

  //    *   update user password and set reset code is_used to true
  const updateOperation = await execUpdate({
    req,
    code: codeVerification.result,
    password,
  });

  if (!updateOperation.success) {
    const { error } = updateOperation;
    const message = "Something went wrong. Please try again later.";

    res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  //    todo: sign in user
  res
    .status(200)
    .json({ success: true, message: "Password changed successfully." });
}
//#region Util

async function execUpdate(args: {
  req: Request<{ code: string }, {}, Schemas.ResetPassword>;
  code: ViewModels.PasswordResetCode;
  password: string;
}) {
  const { passwordManagementService } = args.req;

  try {
    return await execTransaction(async (tx) => {
      //    ! update user password
      args.req.requestLogger.log("debug", "Updating password...");
      const userUpdate = await passwordManagementService.updatePassword({
        dbOrTx: tx,
        codeId: args.code.id,
        userId: args.code.userId,
        password: args.password,
      });

      if (!userUpdate.success) return userUpdate; //  ! propagate error

      //    ! update token
      args.req.requestLogger.log("debug", "Updating reset token.");
      const codeUpdate = await passwordManagementService.invalidateCode({
        dbOrTx: tx,
        codeId: args.code.id,
      });

      if (!codeUpdate.success) return codeUpdate; //  ! propagate error

      return ResultBuilder.success(null); //  * no need for result data
    });
  } catch (err) {
    return ResultBuilder.fail(
      Core.Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_PASSWORD_RESET_PASSWORD_UPDATE_ERROR",
        message: "Transaction failed.",
        err,
      })
    );
  }
}
//#endregion
