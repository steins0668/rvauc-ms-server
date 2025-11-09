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
  Auth.Core.Middlewares.validateJwt({
    type: "roleBased",
    schema: Auth.Core.Schemas.Payloads.AccessToken.roleBased,
  }),
  Controllers.handleViewRecords
);

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt({
    type: "roleBased",
    schema: Auth.Core.Schemas.Payloads.AccessToken.roleBased,
  }),
  validateRequest(Schemas.ViolationData.newRecord),
  Controllers.handleNewRecord
);
