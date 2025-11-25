import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ResultBuilder } from "../../utils";
import { Data } from "./data";
import { Errors } from "./errors";
import { Schemas } from "./schemas";

export namespace Middlewares {
  export function validateJwt(req: Request, res: Response, next: NextFunction) {
    const { headers, requestLogger: logger } = req;

    logger.log("info", "Validating jwt...");

    logger.log("debug", "Getting authorization header...");
    const authHeader = headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      const message = "Missing or malformed token.";
      logger.log("debug", message);

      return res.status(401).json({ success: false, message });
    }

    const token = authHeader.split(" ")[1] ?? ""; //  * token itself is at index 1

    const retrieveEnv = getTokenSecret();

    if (!retrieveEnv.success) {
      const { error } = retrieveEnv;
      const logMessage = "Environment configuration error.";
      logger.log("error", logMessage, error);

      const message = "Something went wrong. Please try again later.";
      res.status(500).json({ success: false, message });
      return;
    }

    try {
      logger.log("debug", "Validating access token...");

      const payload = jwt.verify(token, retrieveEnv.result);

      const parsed = Schemas.Authentication.station.parse(payload);

      logger.log("info", "Jwt validated.");
      req.stationAuth = parsed;

      return next();
    } catch (err) {
      const error = Errors.Session.normalizeError({
        name: "SESSION_INVALID_TOKEN_ERROR",
        message: "Access token verification failed.",
        err,
      });

      logger.log("error", "Failed validating Jwt.", error);

      const message = "Invalid or expired token.";
      return res.status(401).json({ success: false, message });
    }
  }

  function getTokenSecret() {
    try {
      return ResultBuilder.success(Data.Env.getStationSecret());
    } catch (err) {
      return ResultBuilder.fail(
        Errors.Config.normalizeError({
          name: "CONFIG_STATION_TOKEN_MISCONFIGURED_ERROR",
          message: "Station token is not configured.",
          err,
        })
      );
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      stationAuth: Schemas.Authentication.Station;
    }
  }
}
