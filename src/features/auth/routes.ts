import { Router } from "express";
import { Core } from "./core";
import { MinimalAuthentication } from "./sub-features/minimal-authentication";
import { PasswordManagement } from "./sub-features/password-management";
import { Registration } from "./sub-features/registration";
import { SessionManagement } from "./sub-features/session-management";

export const Routes = Router();

Routes.use(Core.Middlewares.attachAuthenticationService);
Routes.use(Core.Middlewares.attachUserDataService);

Routes.use("/minimal-authentication", MinimalAuthentication.Routes);
Routes.use("/password-management", PasswordManagement.Routes);
Routes.use("/registration", Registration.Routes);
Routes.use("/session-management", SessionManagement.Routes);
