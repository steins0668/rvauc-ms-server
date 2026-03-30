import { Router } from "express";
import { StrictValidatedRequest } from "../../../../interfaces";
import { validateRequest } from "../../../../middlewares";
import { Auth } from "../../../auth";
import { Schemas } from "./schemas";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";

const { classId, studentId } = Schemas.RequestParams;
const { attendanceRecord } = Schemas.RequestQuery;

export const Routes = Router();

Routes.use(Middlewares.attachAttendanceDataService);
Routes.use(Middlewares.attachAttendanceRegistrationService);

Routes.get(
  "/view-records/class/:classId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId,
    query: attendanceRecord,
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

Routes.get(
  "/view-records/class/:classId/student/:studentId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId.extend(studentId.shape),
    query: Schemas.RequestQuery.attendanceRecord,
  }),
  Controllers._handlewViewRecords({
    allowedRoles: ["professor"],
    scope: "student",
    extractInput: (req) => {
      const { validated } = req as StrictValidatedRequest<
        Schemas.RequestParams.ClassId & Schemas.RequestParams.StudentId,
        {},
        {},
        {}
      >;
      const { params } = validated;

      return { classId: params.classId, studentId: params.studentId };
    },
  }),
);

Routes.post(
  "/new-record",
  Auth.Core.Middlewares.validateJwt("minimal"),
  validateRequest({ body: Schemas.RequestBody.newRecord }),
  Controllers.handleNewRecord,
);
