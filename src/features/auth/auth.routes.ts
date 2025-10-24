import { Router } from "express";
import { validateRequest } from "../../middlewares";
import * as controllers from "./controllers";
import { attachSessionManager, attachUserDataService } from "./middlewares";
import { RegisterSchemas } from "./schemas";

export const AuthRoutes = Router();

AuthRoutes.use(attachUserDataService);

AuthRoutes.post(
  "/register/student",
  validateRequest(RegisterSchemas.student),
  controllers.handleRegister<RegisterSchemas.Student>
);

AuthRoutes.use(attachSessionManager);

AuthRoutes.post("/sign-in", controllers.handleSignIn);

AuthRoutes.post("/sign-out", controllers.handleSignOut);

AuthRoutes.post("/refresh", controllers.handleRefresh);
