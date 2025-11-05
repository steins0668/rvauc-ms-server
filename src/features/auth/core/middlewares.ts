import type { Request, Response, NextFunction } from "express";
import { Core } from ".";

export namespace Middlewares {
  export async function attachUserDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.userDataService = await Core.Services.UserData.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      userDataService: Core.Services.UserData.Service;
    }
  }
}
