import { Router } from "express";
import { validateRequest } from "../../middlewares";
import { Auth } from "../auth";
import { Enrollments } from "../enrollments";
import { Violation } from "../violation";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.use(Auth.Core.Middlewares.attachUserDataService);
Routes.use(Enrollments.Core.Middlewares.attachTermDataService);
Routes.use(Middlewares.attachComplianceDataService);

Routes.get(
  "/view-records",
  Auth.Core.Middlewares.validateJwt("full"),
  Controllers.handleViewRecords
);

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt("full", "minimal"),
  validateRequest({ body: Schemas.ComplianceData.newRecord }),
  Violation.Middlewares.attachViolationDataService,
  Controllers.handleNewRecord
);
