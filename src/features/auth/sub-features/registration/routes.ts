import { Router } from "express";
import { validateRequest } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.post(
  "/register",
  validateRequest(Schemas.Register._roleBased),
  Controllers.handleRegister
);
