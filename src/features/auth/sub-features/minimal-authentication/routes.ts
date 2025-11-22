import { Router } from "express";
import { validateRequestBody } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.post(
  "/sign-in",
  validateRequestBody(Schemas.SignIn.methodsSchema),
  Controllers.handleSignIn
);
