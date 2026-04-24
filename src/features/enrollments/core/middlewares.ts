import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachTermDataService(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    req.termDataService = await Services.TermData.create();
    next();
  }

  export async function attachClassSessionDataService(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    req.classSessionDataService = await Services.ClassSessionData.create();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      classSessionDataService: Services.ClassSessionData.Service;
      termDataService: Services.TermData.Service;
    }
  }
}
