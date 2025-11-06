import type { Request, Response, NextFunction } from "express";
import { Services } from "./services";
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
}

declare global {
  namespace Express {
    interface Request {
      sessionManager: Services.SessionManager.Service;
      signInRequestService: Services.SignInRequest.Service;
    }
  }
}
