import { Router } from "express";
import { validateRequestBody } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.post(
  "/register",
  validateRequestBody(Schemas.Register.roleBased),
  Controllers.handleRegister
);
