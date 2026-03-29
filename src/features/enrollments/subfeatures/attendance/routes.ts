import { Router } from "express";
import { StrictValidatedRequest } from "../../../../interfaces";
import { validateRequest } from "../../../../middlewares";
import { Auth } from "../../../auth";
import { Schemas } from "./schemas";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";

export const Routes = Router();

Routes.use(Middlewares.attachAttendanceDataService);
Routes.use(Middlewares.attachAttendanceRegistrationService);

Routes.get(
  "/view-records/enrollment/:classId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: Schemas.RequestParams.classId,
    query: Schemas.RequestQuery.attendanceRecord,
  }),
  Controllers._handlewViewRecords({
    allowedRoles: ["student", "professor"],
    scope: "class",
    extractInput: (req) => {
      const { validated } = req as StrictValidatedRequest<
        Schemas.RequestParams.ClassId,
        {},
        {},
        {}
      >;
      const { params } = validated;

      return { classId: params.classId };
    },
  }),
);

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt("minimal"),
  validateRequest({ body: Schemas.RequestBody.newRecord }),
  Controllers.handleNewRecord,
);
