import { Request, Response } from "express";
import crypto from "crypto";
import { ResultBuilder } from "../../../../../utils";
import { Schemas } from "../schemas";
import { AuthError } from "../../../error";
import { ViewModels } from "../../../types";

export async function handleResetPassword(
  req: Request<{ token: string }, {}, Schemas.ResetPassword>,
  res: Response
) {
  const { body, passwordManagementService, requestLogger: logger } = req;
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
  const tokenVerification = await verifyResetToken(req);

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

  //    *   update user password
  //    set reset token is_used to true
  //    optional: sign in user
}

/**
 * @description queries the db for an unused token with the given hash.
 * ! note that there is only ever one unused token.
 * @param req
 * @returns
 */
async function verifyResetToken(
  req: Request<{ token: string }, {}, Schemas.ResetPassword>
) {
  const tokenHash = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const query = await req.passwordManagementService.queryResetTokenStrict({
    tokenHash,
    isUsed: false,
  });

  if (query.success) {
    const now = new Date().getTime();
    const expiry = new Date(query.result.expiresAt).getTime();
    const isExpired = expiry <= now;

    if (isExpired)
      return ResultBuilder.fail(
        new AuthError.Authentication.ErrorClass({
          name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_EXPIRED_ERROR",
          message: "Token is already expired.",
        })
      );
  }

  return query;
}

async function updateTransaction(args: {
  req: Request<{ token: string }, {}, Schemas.ResetPassword>;
  token: ViewModels.PasswordResetToken;
  password: string;
}) {
  const { passwordManagementService } = args.req;
}
