import { Router } from "express";
import { StrictValidatedRequest } from "../../../../interfaces";
import { validateRequest } from "../../../../middlewares";
import { Auth } from "../../../auth";
import { Schemas } from "./schemas";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";

const { classId, classOfferingId, studentId } = Schemas.RequestParams;
const { attendanceRecord } = Schemas.RequestQuery;

export const Routes = Router();

Routes.use(Middlewares.attachAttendanceDataService);
Routes.use(Middlewares.attachAttendanceRegistrationService);

/**
 * GET /view-records/class/:classId
 *
 * @returns {import("./schemas").Schemas.Dto.ClassAttendance.ProfessorView} for professors
 * @returns {import("./schemas").Schemas.Dto.ClassAttendance.StudentView} for students
 */
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

/**
 * GET /view-records/class/:classId/student/:studentId
 *
 * @returns {import('./schemas').Schemas.Dto.StudentAttendance.ProfessorView} for professors
 */
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

Routes.post(
  "/records/class/:classId/class-offering/:classOfferingId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId.extend(classOfferingId.shape),
    body: Schemas.RequestBody.recordSubmission,
  }),
  Controllers.handleSubmitRecords,
);
