import { Request, Response } from "express";
import crypto from "crypto";
import { ResultBuilder } from "../../../../../utils";
import { AuthError } from "../../../error";
import { UserDataService } from "../../../services";
import { Schemas } from "../schemas";
import { Utils } from "../utils";
import { AuthenticationResult } from "../../../types";

export async function handleForgotPassword(
  req: Request<{}, {}, Schemas.ForgotPassword>,
  res: Response
) {
  const { body, userDataService, requestLogger: logger } = req;
  //  * get user based on POST email
  logger.log("debug", "Verifying user...");
  const verification = await verifyUser({ userDataService, email: body.email });

  if (!verification.success) {
    //  ! failed verifying user
    const { error } = verification;

    res
      .status(AuthError.Authentication.getErrStatusCode(error))
      .json({ success: false, message: error.message });

    const safeId = body.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
    const logMsg = `Failed sign-in attempt from user ${safeId}.`;
    logger.log("error", logMsg, error);

    return;
  }

  const user = verification.result;

  //  * verify if no active reset token exists
  logger.log("debug", "Verifying if no active reset tokens exist.");
  const activeTokenVerification = await verifyNoActiveToken({
    req,
    userId: user.id,
  });

  if (!activeTokenVerification.success) {
    //  ! failed querying the database
    const { error } = activeTokenVerification;
    const message = "Something went wrong. Please try again later.";

    res
      .status(AuthError.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  } else if (!activeTokenVerification.result) {
    //  ! active reset token exists
    res
      .status(403) // ! Forbidden. Active token still exists.
      .json({
        success: false,
        message:
          "You still have an active request. Please try again in 10 minutes.",
      });

    return;
  }

  //  * generate random reset token
  logger.log("debug", "Generating reset token...");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const tokenCreation = await req.passwordManagementService.storeResetToken(
    user.id,
    tokenHash
  );

  if (!tokenCreation.success) {
    //  ! failed creating token
    const { error } = tokenCreation;
    const message = "Failed generating reset token. Please try again later.";

    res
      .status(AuthError.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  }

  //  * send reset url to email
  logger.log("debug", "Sending reset url...");
  const emailTransport = await sendEmail({
    req,
    resetToken: token,
    email: user.email,
  });

  if (!emailTransport.success) {
    //  ! failed sending email
    //  * remove reset token from db
    const { id } = tokenCreation.result;
    await req.passwordManagementService.deleteResetToken(id);

    const { error } = emailTransport;

    const message = "Failed sending reset url. Please try again later.";
    res
      .status(AuthError.Authentication.getErrStatusCode(error))
      .json({ success: false, message });

    logger.log("error", error.message, error);

    return;
  }

  res.status(200).json({
    success: true,
    message: "Reset password url sent. Please check your email.",
  });
}
//#region Utils
async function verifyUser(args: {
  email: string;
  userDataService: UserDataService;
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
    AuthError.Authentication.normalizeError({
      name: "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR",
      message: "Could not find user.",
      err: query.error,
    })
  );
}

async function verifyNoActiveToken(args: {
  req: Request<{}, {}, Schemas.ForgotPassword>;
  userId: number;
}): Promise<AuthenticationResult.Success<boolean> | AuthenticationResult.Fail> {
  const query = await args.req.passwordManagementService.queryResetToken({
    userId: args.userId,
    isUsed: false,
  });

  if (query.success) {
    if (query.result) {
      const now = new Date().getTime();
      const expiry = new Date(query.result.expiresAt).getTime();
      const isExpired = expiry <= now;

      return ResultBuilder.success(isExpired); //  * expired token means no active tokens.
    } else return ResultBuilder.success(true); //  * no active tokens. return true
  }

  return query; //  ! something went wrong with the query. propagate failure(query error)
}

async function sendEmail(args: {
  req: Request<{}, {}, Schemas.ForgotPassword>;
  resetToken: string;
  email: string;
}): Promise<AuthenticationResult.Success<null> | AuthenticationResult.Fail> {
  try {
    const { req, resetToken, email } = args;
    const { protocol } = req;
    const host = req.get("host"); //  ! better to use CLIENT_URL here in prod
    const resetUrl = `${protocol}://${host}/auth/reset-password/${resetToken}`;
    const subject = "Password change request received.";
    const text = `We have received a password reset request. Please use the link below to reset your password\n\n${resetUrl}\n\nThis link will be valid for 10 minutes only.`;
    await Utils.EmailTransports.sendEmail({
      to: email,
      subject,
      text,
    });
    return ResultBuilder.success(null);
  } catch (err) {
    return ResultBuilder.fail(
      AuthError.Authentication.normalizeError({
        name: "AUTHENTICATION_PASSWORD_RESET_EMAIL_ERROR",
        message: "Failed sending reset url.",
        err,
      })
    );
  }
}
//#endregion
