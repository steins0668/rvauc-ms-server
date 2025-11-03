import { Request, Response } from "express";
import { execTransaction } from "../../../../../db/create-context";
import { HashUtil, ResultBuilder } from "../../../../../utils";
import { AuthError } from "../../../error";
import { AuthenticationResult, ViewModels } from "../../../types";
import { Schemas } from "../schemas";

export async function handleResetPassword(
  req: Request<{ token: string }, {}, Schemas.ResetPassword>,
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

  //    *   find non-expired reset token with token (encrypt first) from req params
  logger.log("debug", "Finding reset token in db...");
  const tokenHash = HashUtil.byCrypto(req.params.token);
  const tokenVerification =
    await req.passwordManagementService.verifyResetToken(tokenHash);

  if (!tokenVerification.success) {
    const { error } = tokenVerification;
    const message =
      error.name === "AUTHENTICATION_PASSWORD_RESET_TOKEN_QUERY_ERROR"
        ? "Something went wrong. Please try again later"
        : error.message; //  ? either could not find token or token is expired.

    res
      .status(AuthError.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("debug", error.message, error);
    return;
  }

  //    *   update user password and set reset token is_used to true
  const updateOperation = await execUpdate({
    req,
    token: tokenVerification.result,
    password,
  });

  if (!updateOperation.success) {
    const { error } = updateOperation;
    const message = "Something went wrong. Please try again later.";

    res
      .status(AuthError.Authentication.getErrStatusCode(error))
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
  req: Request<{ token: string }, {}, Schemas.ResetPassword>;
  token: ViewModels.PasswordResetToken;
  password: string;
}) {
  const { passwordManagementService, userDataService } = args.req;

  try {
    return await execTransaction(async (tx) => {
      //    ! update user password
      args.req.requestLogger.log("debug", "Updating password...");
      const userUpdate = await userDataService.updateUsers({
        dbOrTx: tx,
        fn: async (update, converter) => {
          const passwordHash = HashUtil.byCrypto(args.password);
          return await update
            .set({ passwordHash })
            .where(converter({ id: args.token.userId }));
        },
      });

      if (!userUpdate.success)
        return ResultBuilder.fail(
          AuthError.Authentication.normalizeError({
            name: "AUTHENTICATION_PASSWORD_RESET_PASSWORD_UPDATE_ERROR",
            message: "Fail updating password.",
            err: userUpdate.error,
          })
        );

      //    ! update token
      args.req.requestLogger.log("debug", "Updating reset token.");
      const tokenUpdate = await passwordManagementService.updateTokenWhere({
        dbOrTx: tx,
        values: { isUsed: true, expiresAt: new Date().toISOString() },
        filter: { id: args.token.id, isUsed: false },
      });

      if (!tokenUpdate.success)
        return ResultBuilder.fail(
          AuthError.Authentication.normalizeError({
            name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_UPDATE_ERROR",
            message: "Fail updating token.",
            err: tokenUpdate.error,
          })
        );

      return ResultBuilder.success(null); //  * no need for result data
    });
  } catch (err) {
    return ResultBuilder.fail(
      AuthError.Authentication.normalizeError({
        name: "AUTHENTICATION_PASSWORD_RESET_PASSWORD_UPDATE_ERROR",
        message: "Transaction failed.",
        err,
      })
    );
  }
}
//#endregion
