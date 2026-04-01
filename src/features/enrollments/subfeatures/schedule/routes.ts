import { Router } from "express";
import { Controllers } from "./controllers";
import { validateRequest } from "../../../../middlewares";
import { Schemas } from "./schemas";
import { Auth } from "../../../auth";

export const Routes = Router();

Routes.get(
  "/get-schedule",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetSchedule,
);

Routes.get(
  "/get-schedule/current-or-next",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetCurrentOrNext,
);

Routes.get(
  "/get-class-list",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetClassList,
);
