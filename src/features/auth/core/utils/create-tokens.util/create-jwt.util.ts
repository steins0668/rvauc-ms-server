import jwt from "jsonwebtoken";
import { Data } from "../../data";
import { Schemas } from "../../schemas";
import { Types } from "../../types";

type AccessOptions = {
  tokenType: Types.Token.Access;
  payload: Schemas.Payloads.AccessToken.RoleBased;
};

type RefreshOptions = {
  tokenType: Types.Token.Refresh;
  payload: Schemas.Payloads.RefreshToken.Payload;
};

type JwtOptions = AccessOptions | RefreshOptions;

/**
 * @public
 * @function createJwt
 * @description A utility function that creates and returns a `JWT` from a provided
 * `options` parameter.
 * @param options.tokenType The token type. See {@link AuthToken} for info on the allowed
 * values.
 * @param options.payload The payload object. May either be a refresh token or access token
 * payload depending on the value of {@link tokenType}
 * @returns The created `JWT`.
 *
 * ! this change was done in favor of allowing the method to accept different payload types
 * ! depending on the token type.
 */
export function createJwt({ tokenType, payload }: JwtOptions): string {
  const { secret, signOptions } = Data.Token.configuration[tokenType];

  const token: string = jwt.sign(payload, secret, signOptions);

  return token;
}
