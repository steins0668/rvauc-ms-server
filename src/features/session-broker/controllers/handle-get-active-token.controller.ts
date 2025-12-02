import { Request, Response } from "express";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";

export async function handleGetActiveToken(
  req: Request<Schemas.RequestParams.StationName>,
  res: Response
) {
  const { stationAuth, params, requestLogger: logger } = req;

  logger.log(
    "info",
    `Attempting to retrieve token for station: ${stationAuth.stationName}...`
  );

  const retrieved = await Services.SessionBroker.getToken(params.stationName);

  if (!retrieved.success) {
    const { error } = retrieved;
    logger.log("error", "Failed retrieving token.", error);

    return res
      .status(Errors.Session.getErrStatusCode(error))
      .json({ success: false, message: "Failed retrieving token." });
  }

  if (retrieved.success && !retrieved.result) {
    logger.log(
      "info",
      `Failed retrieving token. ${stationAuth.stationName} has no active tokens.`
    );

    return res
      .status(404)
      .json({ success: false, message: "Failed retrieving token." });
  }

  logger.log("info", "Token retrieved.");

  res.status(200).json({ success: true, result: retrieved.result });
}
