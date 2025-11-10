import { ResultBuilder } from "../../../../../utils";
import { Data } from "../../data";
import { Errors } from "../../errors";
import { Schemas } from "../../schemas";
import { createJwt } from "./create-jwt.util";

type Payloads = {
  access: Schemas.Payloads.AccessToken.RoleBased;
  refresh: Schemas.Payloads.RefreshToken.Payload;
};

export function createTokens(payloads: Payloads) {
  try {
    validatePayloads(payloads);

    const accessToken = createJwt({
      tokenType: "access",
      payload: payloads.access,
    });

    const refreshToken = createJwt({
      tokenType: "refresh",
      payload: payloads.refresh,
    });

    return ResultBuilder.success({ accessToken, refreshToken });
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
  const validationErr = (message: string, err: unknown) =>
    Errors.Authentication.normalizeError({
      name: "AUTHENTICATION_PAYLOAD_VALIDATION_ERROR",
      message,
      err,
    });

  const accessValidation = Schemas.Payloads.AccessToken.roleBased.safeParse(
    payloads.access
  );

  const refreshValidation = Schemas.Payloads.RefreshToken.payload.safeParse(
    payloads.refresh
  );

  const isAccessValid = accessValidation.success;
  const isRefreshValid = refreshValidation.success;

  if (!isAccessValid && !isRefreshValid)
    throw validationErr(
      "Failed access payload and refresh payload validation.",
      {
        accessError: accessValidation.error,
        refreshError: refreshValidation.error,
      }
    );

  if (!isAccessValid)
    throw validationErr(
      "Failed access payload validation.",
      accessValidation.error
    );

  if (!isRefreshValid)
    throw validationErr(
      "Failed refresh payload validation.",
      refreshValidation.error
    );
}
