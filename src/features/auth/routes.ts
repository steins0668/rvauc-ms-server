import { Router } from "express";
import { validateRequest } from "../../middlewares";
import { Core } from "./core";
import { PasswordManagement } from "./sub-features/password-management";
import { Registration } from "./sub-features/registration";
import { SessionManagement } from "./sub-features/session-management";

export const Routes = Router();

Routes.use(Core.Middlewares.attachUserDataService);

//  * Registration
Routes.post(
  "/register",
  validateRequest(Registration.Schemas.Register.roleBased),
  Registration.Controllers.handleRegister
);

Routes.use(SessionManagement.Middlewares.attachSessionManager);

Routes.post(
  "/sign-in",
  validateRequest(SessionManagement.Schemas.SignIn.schema),
  SessionManagement.Controllers.handleSignIn
);

Routes.post(
  "/sign-out",
  validateRequest(SessionManagement.Schemas.Payloads.RefreshToken.schema),
  SessionManagement.Controllers.handleSignOut
);

Routes.post(
  "/refresh",
  validateRequest(SessionManagement.Schemas.Payloads.RefreshToken.schema),
  SessionManagement.Controllers.handleRefresh
);

//  * Password Management
Routes.use(PasswordManagement.Middlewares.attachPasswordManagementService);

Routes.post(
  "/forgot-password",
  validateRequest(PasswordManagement.Schemas.forgotPassword),
  PasswordManagement.Controllers.handleForgotPassword
);

Routes.post(
  "/verify-code",
  validateRequest(PasswordManagement.Schemas.verifyCode),
  PasswordManagement.Controllers.handleVerifyCode
);

Routes.post(
  "/reset-password",
  validateRequest(PasswordManagement.Schemas.resetPassword),
  PasswordManagement.Controllers.handleResetPassword
);
