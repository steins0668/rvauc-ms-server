import { Router } from "express";
import { Auth } from "../auth";
import { Controllers } from "./controllers";

export const Routes = Router();

Routes.use(Auth.Core.Middlewares.validateJwt);

Routes.get("/get-notifications/:userId", Controllers.handleGetNotifications);
Routes.delete("/clear-notifications", Controllers.handleClearNotifications);
