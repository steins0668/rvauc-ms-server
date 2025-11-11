import { Router } from "express";
import { validateRequest } from "../../middlewares";
import { Core } from "./core";
import { MinimalAuthentication } from "./sub-features/minimal-authentication";
import { PasswordManagement } from "./sub-features/password-management";
import { Registration } from "./sub-features/registration";
import { SessionManagement } from "./sub-features/session-management";

export const Routes = Router();

Routes.use(Core.Middlewares.attachAuthenticationService);
Routes.use(Core.Middlewares.attachUserDataService);

//  * Registration
Routes.post(
  "/register",
  validateRequest(Registration.Schemas.Register.roleBased),
  Registration.Controllers.handleRegister
);

//  * Minimal Authentication
Routes.post(
  "/minimal-sign-in",
  validateRequest(MinimalAuthentication.Schemas.SignIn.schema),
  MinimalAuthentication.Controllers.handleSignIn
);

//  * Session Management
Routes.use(SessionManagement.Middlewares.attachSessionManager);

Routes.post(
  "/sign-in",
  SessionManagement.Middlewares.attachSignInRequestService,
  validateRequest(SessionManagement.Schemas.SignIn.schema),
  SessionManagement.Controllers.handleRequestSignInCode
);

Routes.post(
  "/verify-sign-in-code",
  SessionManagement.Middlewares.attachSignInRequestService,
  validateRequest(SessionManagement.Schemas.verifyCode),
  SessionManagement.Controllers.handleVerifyCode
);

Routes.post(
  "/sign-out",
  validateRequest(SessionManagement.Schemas.Payloads.RefreshToken.schema),
  SessionManagement.Controllers.handleSignOut
);

Routes.post("/refresh", SessionManagement.Controllers.handleRefresh);

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
