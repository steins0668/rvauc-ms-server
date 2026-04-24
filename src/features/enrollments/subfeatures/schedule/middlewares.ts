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
}

declare global {
  namespace Express {
    interface Request {
      classSchedService: Services.ClassSchedule.Service;
    }
  }
}
