import { Router } from "express";
import { validateRequest } from "../../../../middlewares";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";
import { Schemas } from "./schemas";

export const Routes = Router();

Routes.use(Middlewares.attachSessionManager);

Routes.post(
  "/sign-in",
  Middlewares.attachSignInRequestService,
  validateRequest({ body: Schemas.SignIn.schema }),
  Controllers.handleRequestSignInCode
);

Routes.post(
  "/verify-code",
  Middlewares.attachSignInRequestService,
  validateRequest({ body: Schemas.verifyCode }),
  Controllers.handleVerifyCode
);

Routes.post(
  "/sign-out",
  validateRequest({ body: Schemas.Payloads.RefreshToken.schema }),
  Controllers.handleSignOut
);

Routes.post(
  "/refresh",
  validateRequest({ body: Schemas.Payloads.RefreshToken.schema }),
  Controllers.handleRefresh
);
