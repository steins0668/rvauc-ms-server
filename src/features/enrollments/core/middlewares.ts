import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachActiveClassService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.activeClassService = await Services.ActiveClass.createService();
    next();
  }

  export async function attachTermDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.termDataService = await Services.TermData.create();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      activeClassService: Services.ActiveClass.Service;
      termDataService: Services.TermData.Service;
    }
  }
}
