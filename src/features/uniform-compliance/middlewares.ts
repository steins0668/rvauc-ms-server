import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachComplianceDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.complianceDataService = await Services.ComplianceData.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      complianceDataService: Services.ComplianceData.Service;
    }
  }
}
