import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachViolationDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.violationDataService = await Services.ViolationData.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      violationDataService: Services.ViolationData.Service;
    }
  }
}
