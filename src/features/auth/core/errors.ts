import { BaseError } from "../../../error";
import { Exhaustive } from "../../../types";
import { isError, StatusCode } from "../../../utils";

export namespace Errors {
  export namespace Authentication {
    export type ErrorName =
      | "AUTHENTICATION_IDENTITY_USER_NOT_FOUND_ERROR" // for users not found
      | "AUTHENTICATION_PASSWORD_RESET_EMAIL_ERROR" //  for failure of sending reset url email to users
      | "AUTHENTICATION_PASSWORD_RESET_PASSWORD_MISMATCH_ERROR" // for password and confirm password mismatch
      | "AUTHENTICATION_PASSWORD_RESET_PASSWORD_UPDATE_ERROR" // for failure of updating password
      | "AUTHENTICATION_PASSWORD_RESET_CODE_ALREADY_USED_ERROR" // code is already used
      | "AUTHENTICATION_PASSWORD_RESET_CODE_CREATION_ERROR" // for password reset code failing to create or store
      | "AUTHENTICATION_PASSWORD_RESET_CODE_DELETE_ERROR" //  for failing password reset code deletion
      | "AUTHENTICATION_PASSWORD_RESET_CODE_EXPIRED_ERROR" //  for attempting to use expired code
      | "AUTHENTICATION_PASSWORD_RESET_CODE_NOT_FOUND_ERROR" //  for missing code
      | "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR" //  for failure finding reset code
      | "AUTHENTICATION_PASSWORD_RESET_CODE_UPDATE_ERROR" //  for failure updating reset code
      | "AUTHENTICATION_PASSWORD_RESET_CODE_EXISTING_CODE_ERROR" //  for duplicate forgot password requests
      | "AUTHENTICATION_SIGN_IN_REQUEST_CODE_ALREADY_USED_ERROR" // sign-in request code already used
      | "AUTHENTICATION_SIGN_IN_REQUEST_CODE_CREATION_ERROR" // for sign-in request failing to create or store
      | "AUTHENTICATION_SIGN_IN_REQUEST_CODE_EXPIRED_ERROR" // for attempting to use expired code
      | "AUTHENTICATION_SIGN_IN_REQUEST_CODE_QUERY_ERROR" // for failure finding sign-in request
      | "AUTHENTICATION_SIGN_IN_REQUEST_EMAIL_ERROR" // failed sending sign in request code to email
      | "AUTHENTICATION_SIGN_IN_SYSTEM_ERROR" //  internal errors (e.g. db)
      | "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR" //  for incorrect login credentials
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

    export const statusCodeMap: Exhaustive<ErrorName> = {
      AUTHENTICATION_IDENTITY_USER_NOT_FOUND_ERROR: 401,
      AUTHENTICATION_PASSWORD_RESET_EMAIL_ERROR: 500,
      AUTHENTICATION_PASSWORD_RESET_PASSWORD_MISMATCH_ERROR: 403, //  forbidden
      AUTHENTICATION_PASSWORD_RESET_PASSWORD_UPDATE_ERROR: 500,
      AUTHENTICATION_PASSWORD_RESET_CODE_ALREADY_USED_ERROR: 403,
      AUTHENTICATION_PASSWORD_RESET_CODE_CREATION_ERROR: 500,
      AUTHENTICATION_PASSWORD_RESET_CODE_DELETE_ERROR: 500,
      AUTHENTICATION_PASSWORD_RESET_CODE_EXPIRED_ERROR: 401,
      AUTHENTICATION_PASSWORD_RESET_CODE_NOT_FOUND_ERROR: 404,
      AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR: 500,
      AUTHENTICATION_PASSWORD_RESET_CODE_UPDATE_ERROR: 500,
      AUTHENTICATION_PASSWORD_RESET_CODE_EXISTING_CODE_ERROR: 403,
      AUTHENTICATION_SIGN_IN_REQUEST_CODE_ALREADY_USED_ERROR: 403,
      AUTHENTICATION_SIGN_IN_REQUEST_CODE_CREATION_ERROR: 500,
      AUTHENTICATION_SIGN_IN_REQUEST_CODE_EXPIRED_ERROR: 401,
      AUTHENTICATION_SIGN_IN_REQUEST_CODE_QUERY_ERROR: 500,
      AUTHENTICATION_SIGN_IN_REQUEST_EMAIL_ERROR: 500,
      AUTHENTICATION_SIGN_IN_SYSTEM_ERROR: 500, //  internal server error
      AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR: 401, //  unauthorized
      AUTHENTICATION_SESSION_CLEANUP_ERROR: 500,
      AUTHENTICATION_SESSION_START_ERROR: 500,
      AUTHENTICATION_SESSION_TOKEN_CREATION_ERROR: 500,
      AUTHENTICATION_SESSION_TOKEN_EXPIRED_OR_INVALID_ERROR: 403,
      AUTHENTICATION_SESSION_TOKEN_MALFORMED_ERROR: 403,
      AUTHENTICATION_SESSION_TOKEN_MISSING_ERROR: 403,
      AUTHENTICATION_SESSION_TOKEN_REUSE_ERROR: 403,
      AUTHENTICATION_SESSION_TOKEN_ROTATION_ERROR: 500,
      AUTHENTICATION_SESSION_REFRESH_ERROR: 500,
    } as const;

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
        statusCodeMap,
      });
    }
  }
}
