import { Router } from "express";
import { Controllers } from "./controllers";
import { validateRequest } from "../../../../middlewares";
import { Core } from "../../core";
import { Schemas } from "./schemas";
import { Auth } from "../../../auth";

export const Routes = Router();

/**
 * GET
 *
 * @returns {Core.Schemas.Dto.ScheduledClassesWithProfessor}
 */
Routes.get(
  "/get-schedule",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetSchedule,
);

/**
 * GET
 *
 * @returns {Core.Schemas.Dto.ScheduledSessionWithProfessor}
 */
Routes.get(
  "/get-schedule/current-or-next",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetCurrentOrNext,
);

/**
 * GET
 *
 * @returns {Core.Schemas.Dto.ScheduledClassesWithProfessor}
 */
Routes.get(
  "/get-class-list",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetClassList,
);
