import { Router } from "express";
import { validateRequest } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Middlewares } from "./middleware";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.use(Middlewares.attachPasswordManagementService);

Routes.post(
  "/forgot-password",
  validateRequest({ body: Schemas.forgotPassword }),
  Controllers.handleForgotPassword
);

Routes.post(
  "/verify-code",
  validateRequest({ body: Schemas.verifyCode }),
  Controllers.handleVerifyCode
);

Routes.post(
  "/reset-password",
  validateRequest({ body: Schemas.resetPassword }),
  Controllers.handleResetPassword
);
