import { Router } from "express";
import { validateRequestBody } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Middlewares } from "./middleware";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.use(Middlewares.attachPasswordManagementService);

Routes.post(
  "/forgot-password",
  validateRequestBody(Schemas.forgotPassword),
  Controllers.handleForgotPassword
);

Routes.post(
  "/verify-code",
  validateRequestBody(Schemas.verifyCode),
  Controllers.handleVerifyCode
);

Routes.post(
  "/reset-password",
  validateRequestBody(Schemas.resetPassword),
  Controllers.handleResetPassword
);
