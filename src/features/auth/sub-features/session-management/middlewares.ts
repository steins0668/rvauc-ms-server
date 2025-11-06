import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ResultBuilder } from "../../../../utils";
import { Errors } from "../../core/errors";
import { Services } from "./services";
import { Data } from "./data";
import { CustomError } from "./error";
import { Schemas } from "./schemas";
export namespace Middlewares {
  export async function attachSessionManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.sessionManager = await Services.SessionManager.createService();
    next();
  }

  export async function attachSignInRequestService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.signInRequestService = await Services.SignInRequest.createService();
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
      const secret = Data.getTknSecrets().accessSecret;
      return ResultBuilder.success(secret);
    } catch (err) {
      return ResultBuilder.fail(
        CustomError.Config.normalizeError({
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
      sessionManager: Services.SessionManager.Service;
      signInRequestService: Services.SignInRequest.Service;
      authenticationPayload: Schemas.Payloads.AccessToken.RoleBased;
    }
  }
}
