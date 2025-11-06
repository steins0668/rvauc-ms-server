import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ResultBuilder } from "../../../utils";
import { Data } from "./data";
import { Errors } from "./errors";
import { Schemas } from "./schemas";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachUserDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.userDataService = await Services.UserData.createService();
    next();
  }

  export function validateJwt(req: Request, res: Response, next: NextFunction) {
    const { headers, requestLogger } = req;

    const authHeader = headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      const message = "Missing or malformed token.";
      requestLogger.log("debug", message);

      res.status(401).json({ success: false, message });
      return;
    }

    const token = authHeader.split(" ")[1] ?? ""; //  * token itself is at index 1

    const retrieveEnv = accessTknSecret();

    if (!retrieveEnv.success) {
      const { error } = retrieveEnv;
      const logMessage = "Jwt validation failed.";
      requestLogger.log("debug", logMessage, error);

      const message = "Something went wrong. Please try again later.";
      res.status(500).json({ success: false, message });
      return;
    }

    try {
      requestLogger.log("debug", "Validating access token...");

      const payload = jwt.verify(
        token,
        retrieveEnv.result
      ) as Schemas.Payloads.AccessToken.RoleBased;

      req.authenticationPayload = payload;

      requestLogger.log("debug", "Access token validated.");
      next();
    } catch (err) {
      const error = Errors.Authentication.normalizeError({
        name: "AUTHENTICATION_SESSION_TOKEN_EXPIRED_OR_INVALID_ERROR",
        message: "Access token verification failed.",
        err,
      });

      requestLogger.log("debug", "Failed validating Jwt.", error);

      const message = "Invalid or expired token.";
      res.status(401).json({ success: false, message });
      return;
    }
  }

  function accessTknSecret() {
    try {
      const secret = Data.Env.getTknSecrets().accessSecret;
      return ResultBuilder.success(secret);
    } catch (err) {
      return ResultBuilder.fail(
        Errors.Config.normalizeError({
          name: "AUTH_CONFIG_ENV_TKN_SECRET_ERROR",
          message: "ACCESS_TOKEN_SECRET not configured",
          err,
        })
      );
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      userDataService: Services.UserData.Service;
      authenticationPayload: Schemas.Payloads.AccessToken.RoleBased;
    }
  }
}
