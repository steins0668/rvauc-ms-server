import { Request, Response } from "express";
import { execTransaction } from "../../../../../db/create-context";
import { HashUtil, ResultBuilder } from "../../../../../utils";
import { Notifications } from "../../../../notifications";
import { Core } from "../../../core";
import { ViewModels } from "../../../types";
import { Schemas } from "../schemas";

export async function handleResetPassword(
  req: Request<{}, {}, Schemas.ResetPassword>,
  res: Response
) {
  const { body, requestLogger: logger } = req;
  const { code, password, confirmPassword } = body;

  logger.log("info", "Resetting password...");

  //    get password and confirm password from req body
  if (password !== confirmPassword) {
    logger.log("info", "Password and confirm password mismatch.");

    return res
      .status(403) // * forbidden
      .json({
        success: false,
        message:
          "Password and confirm password fields do not match. Please try again.",
      });
  }

  //    *   find non-expired reset code with code (encrypt first) from req params
  logger.log("debug", "Finding reset code in db...");
  const codeHash = HashUtil.byCrypto(code);
  const codeVerification = await req.passwordManagementService.verifyResetCode(
    codeHash
  );

  if (!codeVerification.success) {
    const { error } = codeVerification;
    logger.log("debug", "Failed verifying code...", error);

    const message =
      error.name === "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR"
        ? "Something went wrong. Please try again later"
        : error.message; //  ? either could not find code or code is expired.

    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }

  //    *   update user password and set reset code is_used to true
  logger.log("debug", "Updating user passsword and invalidating code...");
  const updateOperation = await execUpdate({
    req,
    code: codeVerification.result,
    password,
  });

  if (!updateOperation.success) {
    const { error } = updateOperation;
    logger.log("error", "Update transaction failed.", error);

    const message = "Something went wrong. Please try again later.";
    return res
      .status(Core.Errors.Authentication.getErrStatusCode(error))
      .json({ success: false, message });
  }
  logger.log("info", "Succeess resetting password.");

  const message = "Password changed successfully.";

  //    todo: sign in user
  res.status(200).json({ success: true, message });
}
//#region Util
async function execUpdate(args: {
  req: Request<{}, {}, Schemas.ResetPassword>;
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
