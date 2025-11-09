import { BaseResult } from "../../../../../types";
import { ResultBuilder } from "../../../../../utils";
import { ViewModels } from "../../../types";
import { Data } from "../../data";
import { Errors } from "../../errors";
import { Schemas } from "../../schemas";
import { Services } from "../../services";
import { createJwt } from "./create-jwt.util";
import { payloadResolver } from "./payload-resolver.util";

type Role = keyof typeof Data.Records.roles;

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * @public
 * @async
 * @function createTokens
 * @description A helper for the {@link handleLogin} controller. Asynchronously handles access
 * and refresh token creation.
 * - Retrieves a list of `role`s associated with the `User`.
 * - Creates a token payload containing the `verifiedUser` and the list of `role`s.
 * - Creates JWT `access` and `refresh` tokens containing the payload.
 * - Returns both tokens.
 * @param req
 * @param verifiedUser A {@link UserViewModel} used for retrieving the `User`'s `role`s and
 * creating the token `payload`.
 * @param sessionNumber The `sessionNumber` corresponding to the current `UserSession`.
 * @param isPersistentAuth An optional boolean representing the persistence of the authentication state.
 * `true` if the auth is persistent. `false` otherwise.
 * @returns A `Promise` that resolves to a {@link Tokens} object containing the `accessToken`
 * and `refreshToken`.
 */
export async function createTokens(args: {
  userDataService: Services.UserData.Service;
  verifiedUser: ViewModels.User;
  sessionNumber: string;
  isPersistentAuth?: boolean | undefined;
}): Promise<
  | BaseResult.Success<Tokens, "TOKEN_CREATION">
  | BaseResult.Fail<Errors.Authentication.ErrorClass>
> {
  const { userDataService, verifiedUser, sessionNumber, isPersistentAuth } =
    args;

  try {
    const role = Object.values(Data.Records.roles).find(
      (role) => role.id === verifiedUser.roleId
    )!.name as Role; //  ! throws in case of undefined.
    const createAccessTkn = await createAccessToken({
      userDataService,
      verifiedUser,
      role,
    });

    if (!createAccessTkn.success) throw createAccessTkn.error;

    const accessToken = createAccessTkn.result;

    const refreshToken = createRefreshToken({
      sessionNumber,
      userId: verifiedUser.id,
      isPersistentAuth,
    });

    return ResultBuilder.success(
      { accessToken, refreshToken },
      "TOKEN_CREATION"
    );
  } catch (err) {
    return ResultBuilder.fail(
      Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_SESSION_TOKEN_CREATION_ERROR",
        message: "Failed creating tokens.",
        err,
      })
    );
  }
}

async function createAccessToken(args: {
  userDataService: Services.UserData.Service;
  verifiedUser: ViewModels.User;
  role: Role;
}) {
  const { userDataService, role, verifiedUser } = args;

  const payloadResolution = await payloadResolver[role](
    userDataService,
    verifiedUser
  );

  if (!payloadResolution.success) return payloadResolution;

  return ResultBuilder.success(
    createJwt({
      tokenType: "access",
      payload: payloadResolution.result,
    })
  );
}

function createRefreshToken(args: {
  sessionNumber: string;
  userId: number;
  isPersistentAuth?: boolean | undefined;
}) {
  const { sessionNumber, userId, isPersistentAuth } = args;

  const payload: Schemas.Payloads.RefreshToken.Payload = {
    sessionNumber,
    userId,
    isPersistentAuth,
  };
  return createJwt({
    tokenType: "refresh",
    payload,
  });
}
