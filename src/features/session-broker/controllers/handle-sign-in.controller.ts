import { Request, Response } from "express";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";
import { BaseResponse } from "../../../types";

export async function handleSignIn(
  req: Request<{}, {}, Schemas.RequestBody.StationSignIn>,
  res: Response<BaseResponse.Union<string>>
) {
  const { stationAuth, body, requestLogger: logger } = req;

  logger.log(
    "info",
    `Attempting to sign-in with station: ${stationAuth.stationName}...`
  );

  const { stationName, ...authDetails } = body;

  try {
    const authenticated = await Services.Api.signIn(authDetails);

    if (!authenticated.success) {
      logger.log("debug", "Failed minimal authentication.");
      throw authenticated.error;
    }

    const { result: token } = authenticated;

    const stored = await Services.SessionBroker.storeToken(stationName, token);

    if (!stored.success) {
      logger.log("debug", "Failed storing token in redis.");
      throw stored.error;
    }

    logger.log("info", "Successfully signed in.");

    res
      .status(200)
      .json({
        success: true,
        result: token,
        message: "Successfully signed in.",
      });
  } catch (err) {
    const error = Errors.Session.normalizeError({
      name: "SESSION_SIGN_IN_ERROR",
      message: "Failed signing in.",
      err,
    });

    logger.log("error", "Failed signing in.", error);

    res
      .status(Errors.Session.getErrStatusCode(error))
      .json({ success: false, message: "Failed signing in." });
  }
}
