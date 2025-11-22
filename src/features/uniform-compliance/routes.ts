import { Router } from "express";
import { Auth } from "../auth";
import { Middlewares } from "./middlewares";
import { Controllers } from "./controllers";
import { validateRequest } from "../../middlewares";
import { Schemas } from "./schemas";
import { Violation } from "../violation";

export const Routes = Router();

Routes.use(Auth.Core.Middlewares.attachUserDataService);
Routes.use(Middlewares.attachComplianceDataService);

Routes.get(
  "/view-records",
  Auth.Core.Middlewares.validateJwt,
  Controllers.handleViewRecords
);

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt,
  validateRequest({ body: Schemas.ComplianceData.newRecord }),
  Violation.Middlewares.attachViolationDataService,
  Controllers.handleNewRecord
);
