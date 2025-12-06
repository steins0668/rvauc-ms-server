import { Router } from "express";
import { Core } from "./core";
import { Attendance } from "./subfeatures/attendance";
import { Schedule } from "./subfeatures/schedule";

export const Routes = Router();

Routes.use(Core.Middlewares.attachClassScheduleService);
Routes.use(Core.Middlewares.attachTermDataService);

Routes.use("/attendance", Attendance.Routes);
Routes.use("/schedule", Schedule.Routes);
