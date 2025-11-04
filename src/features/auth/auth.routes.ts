import { Router } from "express";
import { validateRequest } from "../../middlewares";
import { attachUserDataService } from "./middlewares";
import { PasswordManagement } from "./sub-features/password-management";
import { Registration } from "./sub-features/registration";
import { SessionManagement } from "./sub-features/session-management";

export const AuthRoutes = Router();

AuthRoutes.use(attachUserDataService);

//  * Registration
AuthRoutes.post(
  "/register",
  validateRequest(Registration.Schemas.Register.roleBased),
  Registration.Controllers.handleRegister
);

AuthRoutes.use(SessionManagement.Middlewares.attachSessionManager);

AuthRoutes.post(
  "/sign-in",
  validateRequest(SessionManagement.Schemas.SignIn.schema),
  SessionManagement.Controllers.handleSignIn
);

AuthRoutes.post("/sign-out", SessionManagement.Controllers.handleSignOut);

AuthRoutes.post("/refresh", SessionManagement.Controllers.handleRefresh);

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
