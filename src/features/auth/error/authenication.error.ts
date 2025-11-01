import { BaseError } from "../../../error";
import { isError, StatusCode } from "../../../utils";
import { AuthStatusCode } from "../data";

export namespace Authentication {
  export type ErrorName =
    | "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR" //  for incorrect login credentials
    | "AUTHENTICATION_SIGN_IN_SYSTEM_ERROR" //  internal errors (e.g. db)
    | "AUTHENTICATION_SESSION_START_ERROR" //  failed starting session
    | "AUTHENTICATION_SESSION_TOKEN_CREATION_ERROR" //  failed creating token
    | "AUTHENTICATION_SESSION_TOKEN_EXPIRED_OR_INVALID_ERROR" //   token is invalid or expired
    | "AUTHENTICATION_SESSION_TOKEN_MALFORMED_ERROR" //  payload doesn't match schema
    | "AUTHENTICATION_SESSION_TOKEN_MISSING_ERROR" //  token is missing
    | "AUTHENTICATION_SESSION_TOKEN_ROTATION_ERROR" //  failed rotating tokens
    | "AUTHENTICATION_SESSION_TOKEN_REUSE_ERROR" //  detected token reuse attempt
    | "AUTHENTICATION_SESSION_CLEANUP_ERROR" //  failed cleaning up/ending session
    | "AUTHENTICATION_SESSION_REFRESH_ERROR"; //  failed refreshing session

  export class ErrorClass extends BaseError<ErrorName> {}

  export function normalizeError<E extends ErrorName>({
    name,
    message,
    err,
  }: {
    name: E;
    message: string;
    err: unknown;
  }) {
    if (isError(ErrorClass, err)) return err;

    return new ErrorClass({
      name,
      message,
      cause:
        err instanceof Error
          ? {
              name: err.name,
              message: err.message,
              stack: err.stack,
            }
          : err,
    });
  }
  export function getErrStatusCode(error: ErrorClass) {
    return StatusCode.fromError({
      errorName: error.name,
      statusCodeMap: AuthStatusCode.AuthenticationError,
    });
  }
}
