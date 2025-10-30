import { Router } from "express";
import { validateRequest } from "../../middlewares";
import * as controllers from "./controllers";
import { attachSessionManager, attachUserDataService } from "./middlewares";
import { RegisterSchemas } from "./schemas";

export const AuthRoutes = Router();

AuthRoutes.use(attachUserDataService);

AuthRoutes.post(
  "/register",
  validateRequest(RegisterSchemas.base),
  controllers.handleRegister
);

AuthRoutes.use(attachSessionManager);

AuthRoutes.post("/sign-in/professor", controllers.handleSignIn("professor"));

AuthRoutes.post("/sign-in/student", controllers.handleSignIn("student"));

AuthRoutes.post("/sign-out", controllers.handleSignOut);

AuthRoutes.post("/refresh/professor", controllers.handleRefresh("professor"));

AuthRoutes.post("/refresh/student", controllers.handleRefresh("student"));
