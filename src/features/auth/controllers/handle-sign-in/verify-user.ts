import { Request } from "express";
import bcrypt from "bcrypt";
import { ResultBuilder } from "../../../../utils";
import { SignInSchema } from "../../schemas";
import { AuthenticationResult, ViewModels } from "../../types";
import { getSignInMethod } from "./get-sign-in-method";

/**
 * @public
 * @async
 * @function getVerifiedUser
 * @description A helper for the `handleSignIn` controller. Asynchronously handles
 * verifying the user from the provided credentials in the request body.
 * - Retrieves the `email` or `username`, and `password` from the request body.
 * - Attempts to read an existing `User` from the database with the provided login fields.
 * - If a `User` is found, verify if the provided password is correct.
 * - If the password is correct, return the User `ViewModel`.
 * @param req The request object.
 * @returns A `Promise` that resolves to the User `ViewModel` that contains details about
 * the verified `User` or `null` if validation or verification fails..
 */
export async function verifyUser(
  req: Request<{}, {}, SignInSchema>
): Promise<
  AuthenticationResult.Success<ViewModels.User> | AuthenticationResult.Fail
> {
  const { body: authDetails, requestLogger } = req;

  requestLogger.log("debug", "Verifying user...");

  const signInMethod = getSignInMethod(authDetails.identifier);

  if (signInMethod === null)
    //  garbage input guard
    return ResultBuilder.fail({
      name: "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR",
      message: "Incorrect sign-in credentials. Please try again.",
    });

  const queryResult = await req.userDataService.queryUsers({
    fn: async (query, converter) => {
      const filter = { [signInMethod]: authDetails.identifier };
      return await query.findFirst({ where: converter(filter) });
    },
  });

  if (queryResult.success) {
    //  query completed and there is a result
    const { result } = queryResult;

    if (result) {
      const { password } = authDetails;
      const { passwordHash } = result;

      const isAuthenticated = await bcrypt.compare(password, passwordHash);

      //  success authenticating with password.
      if (isAuthenticated)
        return ResultBuilder.success(
          result,
          "AUTHENTICATION_SIGN_IN_VERIFY_USER"
        );
    }

    //  no user found with credentials or incorrect password.
    return ResultBuilder.fail({
      name: "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR",
      message: "Incorrect sign-in credentials. Please try again.",
    });
  }

  //  db query failed for some reason.
  return ResultBuilder.fail({
    name: "AUTHENTICATION_SIGN_IN_SYSTEM_ERROR",
    message: "An error occurred while authenticating. Please try again later.",
    cause: queryResult.error,
  });
}
