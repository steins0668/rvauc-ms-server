import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachAttendanceRegistrationService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.attendanceRegistrationService =
      await Services.AttendanceRegistration.create();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      attendanceRegistrationService: Services.AttendanceRegistration.Service;
    }
  }
}
