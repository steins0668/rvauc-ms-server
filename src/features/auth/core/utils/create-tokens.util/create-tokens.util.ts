import { ResultBuilder } from "../../../../../utils";
import { Errors } from "../../errors";
import { Schemas } from "../../schemas";
import { Types } from "../../types";
import { createJwt } from "./create-jwt.util";

export function createTokens(
  payloads: FullPayload
):
  | Types.AuthenticationResult.Success<FullTokens>
  | Types.AuthenticationResult.Fail;
export function createTokens(
  payloads: MinimalPayload
):
  | Types.AuthenticationResult.Success<MinimalToken>
  | Types.AuthenticationResult.Fail;
export function createTokens(
  payloads: Payloads
):
  | Types.AuthenticationResult.Success<Tokens>
  | Types.AuthenticationResult.Fail {
  try {
    validatePayloads(payloads);

    const accessToken = createJwt({
      tokenType: "access",
      payloadType: payloads.type,
      payload: payloads.access,
    });

    let tokens: Tokens = { accessToken };

    if (payloads.type === "full") {
      tokens = {
        ...tokens,
        refreshToken: createJwt({
          tokenType: "refresh",
          payload: payloads.refresh,
        }),
      };
    }

    return ResultBuilder.success(tokens);
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

function validatePayloads(payloads: Payloads) {
  const validationErr = (message: string, err?: unknown) =>
    Errors.Authentication.normalizeError({
      name: "AUTHENTICATION_PAYLOAD_VALIDATION_ERROR",
      message,
      err,
    });

  const { schemaRecord } = Schemas.Payloads.AccessToken;
  const accessSchema = schemaRecord[payloads.type];

  if (!accessSchema)
    throw validationErr(`Invalid schema type ${payloads.type}`);

  const accessValidation = accessSchema.safeParse(payloads.access);
  const isAccessValid = accessValidation.success;

  if (payloads.type === "full") {
    const refreshValidation = Schemas.Payloads.RefreshToken.payload.safeParse(
      payloads.refresh
    );
    const isRefreshValid = refreshValidation.success;

    if (!isAccessValid && !isRefreshValid)
      throw validationErr(
        "Failed access payload and refresh payload validation.",
        {
          accessError: accessValidation.error,
          refreshError: refreshValidation.error,
        }
      );

    if (!isRefreshValid)
      throw validationErr(
        "Failed refresh payload validation.",
        refreshValidation.error
      );
  }

  if (!isAccessValid)
    throw validationErr(
      "Failed access payload validation.",
      accessValidation.error
    );
}

type Payloads = FullPayload | MinimalPayload;
type FullPayload = Extract<AccessPayloads, { type: "full" }> & RefreshPayload;
type MinimalPayload = Extract<AccessPayloads, { type: "minimal" }>;
type AccessPayloads = Schemas.Payloads.AccessToken.AnyPayload extends infer AP
  ? AP extends { type: infer T; payload: infer P }
    ? { type: T; access: P }
    : never
  : never;
type RefreshPayload = { refresh: Schemas.Payloads.RefreshToken.Payload };

type Tokens = FullTokens | MinimalToken;
type FullTokens = AccessToken & RefreshToken;
type MinimalToken = AccessToken;
type AccessToken = { accessToken: string };
type RefreshToken = { refreshToken: string };

// export function createTokens(
//   payloads: AccessPayloadOnly
// ):
//   | Types.AuthenticationResult.Success<AccessToken>
//   | Types.AuthenticationResult.Fail;
// export function createTokens(
//   payloads: DualPayload
// ):
//   | Types.AuthenticationResult.Success<DualTokens>
//   | Types.AuthenticationResult.Fail;
// export function createTokens(
//   payloads: Payloads
// ):
//   | Types.AuthenticationResult.Success<Tokens>
//   | Types.AuthenticationResult.Fail {
//   try {
//     validatePayloads(payloads);

//     const accessToken = createJwt({
//       tokenType: "access",
//       payload: payloads.access,
//     });

//     let tokens: Tokens = { accessToken };

//     if (payloads.refresh) {
//       tokens = {
//         ...tokens,
//         refreshToken: createJwt({
//           tokenType: "refresh",
//           payload: payloads.refresh,
//         }),
//       };
//     }

//     return ResultBuilder.success(tokens);
//   } catch (err) {
//     return ResultBuilder.fail(
//       Errors.Authentication.normalizeError({
//         name: "AUTHENTICATION_SESSION_TOKEN_CREATION_ERROR",
//         message: "Failed creating tokens.",
//         err,
//       })
//     );
//   }
// }

// function validatePayloads(payloads: Payloads) {
//   const validationErr = (message: string, err?: unknown) =>
//     Errors.Authentication.normalizeError({
//       name: "AUTHENTICATION_PAYLOAD_VALIDATION_ERROR",
//       message,
//       err,
//     });

//   const accessSchema = Schemas.Payloads.AccessToken.schemas.find(
//     (value) => value.type === payloads.type
//   )?.schema;

//   if (!accessSchema)
//     throw validationErr(`Invalid schema type ${payloads.type}`);

//   const accessValidation = accessSchema.safeParse(payloads.access);

//   const refreshValidation = Schemas.Payloads.RefreshToken.payload.safeParse(
//     payloads.refresh
//   );

//   const isAccessValid = accessValidation.success;
//   const isRefreshValid = refreshValidation.success;

//   if (!isAccessValid && !isRefreshValid)
//     throw validationErr(
//       "Failed access payload and refresh payload validation.",
//       {
//         accessError: accessValidation.error,
//         refreshError: refreshValidation.error,
//       }
//     );

//   if (!isAccessValid)
//     throw validationErr(
//       "Failed access payload validation.",
//       accessValidation.error
//     );

//   if (!isRefreshValid)
//     throw validationErr(
//       "Failed refresh payload validation.",
//       refreshValidation.error
//     );
// }

// type Payloads = AccessPayloadOnly & Partial<RefreshPayloadOnly>;

// type DualPayload = AccessPayloadOnly & RefreshPayloadOnly;

// type AccessPayloadOnly =
//   Schemas.Payloads.AccessToken.AnyPayload extends infer AP
//     ? AP extends { type: infer T; payload: infer P }
//       ? { type: T; access: P }
//       : never
//     : never;

// type RefreshPayloadOnly = { refresh: Schemas.Payloads.RefreshToken.Payload };

// type Tokens = AccessToken & Partial<RefreshToken>;
// type DualTokens = AccessToken & RefreshToken;
// type AccessToken = { accessToken: string };
// type RefreshToken = { refreshToken: string };
