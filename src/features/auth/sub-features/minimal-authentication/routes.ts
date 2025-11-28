import { Router } from "express";
import { validateRequest } from "../../../../middlewares";
import { Core } from "../../core";
import { Controllers } from "./controllers";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.post(
  "/sign-in",
  Core.Middlewares.validateJwt("microservice"),
  validateRequest({ body: Schemas.SignIn.methodsSchema }),
  Controllers.handleSignIn
);
