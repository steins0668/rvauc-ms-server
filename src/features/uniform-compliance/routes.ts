import { Router } from "express";
import { Auth } from "../auth";
import { Middlewares } from "./middlewares";
import { Controllers } from "./controllers";

export const Routes = Router();

Routes.use(Auth.Core.Middlewares.attachUserDataService);
Routes.use(Middlewares.attachComplianceDataService);

Routes.get(
  "/view-records",
  Auth.Core.Middlewares.validateJwt,
  Controllers.handleViewRecords
);
