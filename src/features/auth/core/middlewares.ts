import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Data } from "./data";
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

  export function validateJwt(
    ...types: Schemas.Payloads.AccessToken.AnySchemaType[]
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { headers, requestLogger } = req;

      const authHeader = headers["authorization"];

      if (!authHeader?.startsWith("Bearer ")) {
        const message = "Missing or malformed token.";
        requestLogger.log("debug", message);

        res.status(401).json({ success: false, message });
        return;
      }

      const token = authHeader.split(" ")[1] ?? ""; //  * token itself is at index 1

      requestLogger.log("debug", "Validating access token...");

      for (const type of types) {
        try {
          const secret = Data.Env.getAccessSecrets()[type];
          const payload = jwt.verify(token, secret);
          requestLogger.log("debug", `Parsing payload with schema: ${type}...`);

          const { schemaRecord } = Schemas.Payloads.AccessToken;
          const parsed = schemaRecord[type].parse(payload);

          req.auth = {
            type,
            payload: parsed,
          } as Schemas.Payloads.AccessToken.AnyPayload;

          requestLogger.log("info", "Access token payload validated.");

          return next();
        } catch (err) {
          requestLogger.log(
            "debug",
            `Failed with secret/schema for type ${type}`,
            err
          );
        }
      }

      requestLogger.log(
        "info",
        `Failed authentication attempt by unauthorized payload type. The only types allowed are: ${types.toString()}`
      );

      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    };
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
