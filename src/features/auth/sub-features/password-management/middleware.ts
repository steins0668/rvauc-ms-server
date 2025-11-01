import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachPasswordManagementService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.passwordManagementService =
      await Services.PasswordManagement.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      passwordManagementService: Services.PasswordManagement.Service;
    }
  }
}
