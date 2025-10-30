import { Router } from "express";
import { validateRequest } from "../../middlewares";
import * as controllers from "./controllers";
import { attachSessionManager, attachUserDataService } from "./middlewares";
import { RegisterSchemas, signInSchema } from "./schemas";

export const AuthRoutes = Router();

AuthRoutes.use(attachUserDataService);

AuthRoutes.post(
  "/register",
  validateRequest(RegisterSchemas.base),
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
