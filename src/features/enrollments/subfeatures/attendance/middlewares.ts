import { NextFunction, Request, Response } from "express";
import { Services } from "./services";

export namespace Middlewares {
  export async function attachAttendanceDataService(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.attendanceDataService = await Services.AttendanceData.createService();
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      attendanceDataService: Services.AttendanceData.Service;
    }
  }
}
