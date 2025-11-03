import { Router } from "express";
import { validateRequest } from "../../middlewares";
import * as controllers from "./controllers";
import { attachSessionManager, attachUserDataService } from "./middlewares";
import { roleBasedRegisterSchema, signInSchema } from "./schemas";
import { PasswordManagement } from "./sub-features/password-management";

export const AuthRoutes = Router();

AuthRoutes.use(attachUserDataService);

AuthRoutes.post(
  "/register",
  validateRequest(roleBasedRegisterSchema),
  controllers.handleRegister
);

AuthRoutes.use(attachSessionManager);

AuthRoutes.post(
  "/sign-in",
  validateRequest(signInSchema),
  controllers.handleSignIn
);

AuthRoutes.post("/sign-out", controllers.handleSignOut);

AuthRoutes.post("/refresh", controllers.handleRefresh);

//  * Password Management
AuthRoutes.use(PasswordManagement.Middlewares.attachPasswordManagementService);

AuthRoutes.post(
  "/forgot-password",
  validateRequest(PasswordManagement.Schemas.forgotPassword),
  PasswordManagement.Controllers.handleForgotPassword
);

AuthRoutes.post(
  "/reset-password/:token",
  validateRequest(PasswordManagement.Schemas.resetPassword),
  PasswordManagement.Controllers.handleResetPassword
);
