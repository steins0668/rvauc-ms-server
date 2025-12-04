import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachEnrollmentDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.enrollmentDataService = await Services.EnrollmentData.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      enrollmentDataService: Services.EnrollmentData.Service;
    }
  }
}
