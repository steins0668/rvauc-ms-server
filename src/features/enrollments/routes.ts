import { Router } from "express";
import { Core } from "./core";
import { Attendance } from "./subfeatures/attendance";

export const Routes = Router();

Routes.use(Core.Middlewares.attachActiveClassService);
Routes.use(Core.Middlewares.attachTermDataService);

Routes.use("/attendance", Attendance.Routes);
