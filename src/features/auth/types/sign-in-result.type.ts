import { BaseResult } from "../../../types";
import { AuthError } from "../error";

export namespace SignInResult {
  type SuccessSource = "SIGN_IN_VERIFY_USER" | "SIGN_IN_COOKIE_CONFIG";
  export type Success<TResult> = BaseResult.Success<TResult, SuccessSource>;
  export type Fail = BaseResult.Fail<AuthError.Authentication.ErrorClass>;
}
