import { Router } from "express";
import { Middlewares } from "../auth/core/middlewares";
import { Controllers } from "./controllers";

export const Routes = Router();

Routes.use(Middlewares.validateJwt("full"));

Routes.get("/get-notifications", Controllers.handleGetNotifications);
Routes.delete("/clear-notifications", Controllers.handleClearNotifications);
