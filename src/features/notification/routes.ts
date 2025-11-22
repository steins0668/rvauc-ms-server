import { Router } from "express";
import { Middlewares } from "../auth/core/middlewares";
import { Controllers } from "./controllers";

export const Routes = Router();

Routes.use(Middlewares.validateJwt);

Routes.get("/get-notifications", Controllers.handleGetNotifications);
Routes.delete("/clear-notifications", Controllers.handleClearNotifications);
