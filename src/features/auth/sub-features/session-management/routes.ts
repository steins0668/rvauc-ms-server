import { Router } from "express";
import { validateRequestBody } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.use(Middlewares.attachSessionManager);

Routes.post(
  "/sign-in",
  Middlewares.attachSignInRequestService,
  validateRequestBody(Schemas.SignIn.schema),
  Controllers.handleRequestSignInCode
);

Routes.post(
  "/verify-code",
  Middlewares.attachSignInRequestService,
  validateRequestBody(Schemas.verifyCode),
  Controllers.handleVerifyCode
);

Routes.post(
  "/sign-out",
  validateRequestBody(Schemas.Payloads.RefreshToken.schema),
  Controllers.handleSignOut
);

Routes.post("/refresh", Controllers.handleRefresh);
