import { BaseResult } from "../../../types";
import { AuthError } from "../error";

export namespace AuthenticationResult {
  type SuccessSource =
    | "AUTHENTICATION_SIGN_IN_VERIFY_USER"
    | "AUTHENTICATION_SIGN_IN_COOKIE_CONFIG"
    | "AUTHENTICATION_SESSION_END"
    | "AUTHENTICATION_SESSION_REFRESH"
    | "AUTHENTICATION_SESSION_START"
    | "AUTHENTICATION_SESSION_TOKEN_VERIFY"
    | "AUTHENTICATION_SESSION_TOKEN_ROTATION";
  export type Success<TResult> = BaseResult.Success<TResult, SuccessSource>;
  export type Fail = BaseResult.Fail<AuthError.Authentication.ErrorClass>;
}
