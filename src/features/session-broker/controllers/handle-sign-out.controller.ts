import { Request, Response } from "express";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";

export async function handleSignOut(
  req: Request<Schemas.RequestParams.StationName>,
  res: Response
) {
  const { stationAuth, params, requestLogger: logger } = req;

  logger.log(
    "info",
    `Attempting to sign out for station: ${stationAuth.stationName}...`
  );

  const deleted = await Services.SessionBroker.deleteToken(params.stationName);

  if (!deleted.success) {
    const { error } = deleted;
    logger.log("error", "Failed deleting token.", error);

    return res
      .status(Errors.Session.getErrStatusCode(error))
      .json({ success: false, message: "Failed signing out." });
  }

  logger.log("info", "Token deleted.");

  res.status(200).json({ success: true, message: "Success signing out." });
}
