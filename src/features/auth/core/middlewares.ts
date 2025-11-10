import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ResultBuilder } from "../../../utils";
import { Data } from "./data";
import { Errors } from "./errors";
import { Schemas } from "./schemas";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachAuthenticationService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.authenticationService = await Services.Authentication.createService();
    next();
  }

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

      const payload = jwt.verify(token, retrieveEnv.result);

      for (const arg of Object.values(Schemas.Payloads.AccessToken.schemas)) {
        requestLogger.log("debug", `Parsing payload with schema ${arg.type}`);
        const parse = arg.schema.safeParse(payload);

        if (parse.success) {
          req.auth = {
            type: arg.type,
            payload: parse.data,
          } as Schemas.Payloads.AccessToken.AnyPayload;
          requestLogger.log("debug", "Access token validated.");
          return next();
        }

        requestLogger.log(
          "debug",
          `Failed parsing schema ${arg.type}`,
          parse.error
        );
      }

      throw new Error("Payload does not match any schema.");
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
      authenticationService: Services.Authentication.Service;
      userDataService: Services.UserData.Service;
      auth: Schemas.Payloads.AccessToken.AnyPayload;
    }
  }
}
