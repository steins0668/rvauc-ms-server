import { Router } from "express";
import { validateRequest } from "../../../../middlewares";
import { Auth } from "../../../auth";
import { Schemas } from "./schemas";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";

export const Routes = Router();

Routes.use(Middlewares.attachAttendanceRegistrationService);

Routes.get("/view-records", Auth.Core.Middlewares.validateJwt("full"));

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt("minimal"),
  validateRequest({ body: Schemas.RequestBody.newRecord }),
  Controllers.handleNewRecord
);
