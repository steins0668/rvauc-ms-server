import { Router } from "express";
import { Auth } from "../auth";
import { validateRequest } from "../../middlewares";
import { Middlewares } from "./middlewares";
import { Controllers } from "./controllers";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.use(Auth.Core.Middlewares.attachUserDataService);
Routes.use(Middlewares.attachViolationDataService);

Routes.get(
  "/view-records",
  Auth.Core.Middlewares.validateJwt("full"),
  Controllers.handleViewRecords
);

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ body: Schemas.ViolationData.newRecord }),
  Controllers.handleNewRecord
);
