import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachAttendanceDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.attendanceDataService = await Services.AttendanceData.create();
    next();
  }

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
      attendanceDataService: Services.AttendanceData.Service;
      attendanceRegistrationService: Services.AttendanceRegistration.Service;
    }
  }
}
