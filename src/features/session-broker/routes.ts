import { Router } from "express";
import { validateRequest } from "../../middlewares";
import { Controllers } from "./controllers";
import { Schemas } from "./schemas";
import { Middlewares } from "./middlewares";

export const Routes = Router();

Routes.post(
  "/sign-in",
  Middlewares.validateJwt,
  validateRequest({ body: Schemas.RequestBody.stationSignIn }),
  Controllers.handleSignIn
);

Routes.post(
  "/sign-out/:stationName",
  Middlewares.validateJwt,
  validateRequest({ params: Schemas.RequestParams.stationName }),
  Controllers.handleSignOut
);

Routes.get(
  "/get-active-session/:stationName",
  Middlewares.validateJwt,
  validateRequest({ params: Schemas.RequestParams.stationName }),
  Controllers.handleGetActiveToken
);
