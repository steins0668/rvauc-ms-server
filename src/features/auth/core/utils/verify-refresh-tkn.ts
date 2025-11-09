import { Request } from "express";
import jwt from "jsonwebtoken";
import { ResultBuilder } from "../../../../utils";
import { Data } from "../data";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Types } from "../types";

/**
 * @public
 * @function verifyRefreshToken
 * @description Helper function for {@link handleRefreshToken} controller. Verifies the
 * refresh token. If the token verification fails, responds with status code `403`.
 * After that, parses the schema with zod `safeParse` method. If the parse fails, responds
 * with status code `403`.
 * todo: revise docs
 * @param req
 * @param refreshToken
 * @param user
 * @returns
 */
export function verifyRefreshTkn(
  req: Request,
  refreshToken: string
):
  | Types.AuthenticationResult.Success<Schemas.Payloads.RefreshToken.Payload>
  | Types.AuthenticationResult.Fail {
  const { requestLogger } = req;

  let payload;
  try {
    payload = jwt.verify(refreshToken, Data.Env.getTknSecrets().refreshSecret);
  } catch (err) {
    requestLogger.log("error", "Invalid or expired refresh token.", err);
    return ResultBuilder.fail(
      Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_SESSION_TOKEN_EXPIRED_OR_INVALID_ERROR",
        message: "Invalid or expired refresh token.",
        err,
      })
    );
  }

  const payloadParse = Schemas.Payloads.RefreshToken.payload.safeParse(payload);
  if (!payloadParse.success) {
    requestLogger.log("error", "Malformed refresh token.");
    return ResultBuilder.fail({
      name: "AUTHENTICATION_SESSION_TOKEN_MALFORMED_ERROR",
      message: "Malformed refresh token.",
    });
  }

  return ResultBuilder.success(
    payloadParse.data,
    "AUTHENTICATION_SESSION_TOKEN_VERIFY"
  );
}
