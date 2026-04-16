import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachClassScheduleService(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    req.classSchedService = await Services.ClassSchedule.createService();
    next();
  }

  export async function attachTermDataService(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    req.termDataService = await Services.TermData.create();
    next();
  }

  export async function attachClassSessionRuntimeService(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    req.classSessionRuntimeService =
      await Services.ClassSessionRuntime.create();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      classSchedService: Services.ClassSchedule.Service;
      classSessionRuntimeService: Services.ClassSessionRuntime.Service;
      termDataService: Services.TermData.Service;
    }
  }
}
