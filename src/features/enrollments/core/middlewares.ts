import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachEnrollmentDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.activeClassService = await Services.ActiveClass.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      activeClassService: Services.ActiveClass.Service;
    }
  }
}
