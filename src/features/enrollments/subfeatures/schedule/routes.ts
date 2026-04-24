import { Router } from "express";
import { Controllers } from "./controllers";
import { validateRequest } from "../../../../middlewares";
import { Schemas } from "./schemas";
import { Core } from "../../core";
import { Auth } from "../../../auth";
import { Middlewares } from "./middlewares";

export const Routes = Router();

Routes.use(Middlewares.attachClassScheduleService);
Routes.use(Middlewares.attachClassSessionRuntimeService);

/**
 * GET
 *
 * @returns {Core.Schemas.Dto.RuntimeProfessorView} for professors
 * @returns {Core.Schemas.Dto.RuntimeStudentView} for students
 */
Routes.get(
  "/current-or-next",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetCurrentOrNext,
);

/**
 * GET
 *
 * @returns {Schemas.Dto.ClassList}
 */
Routes.get(
  "/class-list",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({ query: Schemas.RequestQuery.userSchedule }),
  Controllers.handleGetClassList,
);
