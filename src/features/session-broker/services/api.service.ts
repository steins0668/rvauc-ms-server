import { BaseResponse } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Utils } from "../utils";

export namespace Api {
  export async function signIn(args: Schemas.RequestBody.ServerSignIn) {
    const url = "/auth/minimal-authentication/sign-in";

    type R = BaseResponse.Union<string>;

    try {
      const response = await Utils.serverClient.post<R>(url, args);

      const { success, message } = response.data;
      return success
        ? ResultBuilder.success(response.data.result)
        : ResultBuilder.fail(
            new Errors.Session.ErrorClass({
              name: "SESSION_SIGN_IN_ERROR",
              message: message ?? "Failed signing in.",
            })
          );
    } catch (err) {
      return ResultBuilder.fail(
        Errors.Session.normalizeError({
          name: "SESSION_SIGN_IN_ERROR",
          message: "Failed signing in.",
          err,
        })
      );
    }
  }
}
