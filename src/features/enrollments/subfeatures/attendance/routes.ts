import { Router } from "express";
import { StrictValidatedRequest } from "../../../../interfaces";
import { validateRequest } from "../../../../middlewares";
import { Auth } from "../../../auth";
import { Core } from "../../core";
import { Schemas } from "./schemas";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";

const { classId, classSessionId, enrollmentId, studentId } =
  Schemas.RequestParams;
const { attendanceRecord } = Schemas.RequestQuery;

export const Routes = Router();

Routes.use(Middlewares.attachAttendanceDataService);
Routes.use(Middlewares.attachAttendanceRegistrationService);
//#region OLD ENDPOINTS
/**
 * GET /view-records/class/:classId
 * ! OBSOLETE | BROKEN
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
  Controllers.handleViewRecords({
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
  Controllers.handleNewRfidScan,
);
//#endregion
/**
 * ! past this point are new endpoints. some does exactly the same as the endpoints above but have been renamed for clarity.
 * todo: remove the endpoints above once the client has implemented the new endpoints
 */

/**
 * GET
 *
 * @returns {Core.Schemas.Dto.ClassSession} on success
 */
Routes.get(
  "/class/:classId/sessions",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId,
  }),
  Controllers.handleViewSessions,
);

/**
 * GET
 *
 * @returns {Schemas.Dto.ClassAttendance.StudentView} for students on success
 */
Routes.get(
  "/records/class/:classId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId,
    query: attendanceRecord,
  }),
  Controllers.handleViewRecords({
    allowedRoles: ["student"],
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
 * GET
 *
 * @returns {Schemas.Dto.ClassAttendance.ProfessorView} for professors on success
 */
Routes.get(
  "/records/class/offering/session/:classSessionId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classSessionId,
    query: attendanceRecord,
  }),
  Controllers.handleViewRecords({
    allowedRoles: ["professor"],
    scope: "class",
    extractInput: (req) => {
      const { validated } = req as StrictValidatedRequest<
        Schemas.RequestParams.ClassSessionId,
        {},
        {},
        {}
      >;
      const { params } = validated;

      return {
        classSessionId: params.classSessionId,
      };
    },
  }),
);

/**
 * POST
 * Only allows professors for now.
 * @returns {Schemas.Dto.ClassAttendance.MutationResult } for professors on success
 */
Routes.post(
  "/records/class/offering/session/:classSessionId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classSessionId,
    body: Schemas.RequestBody.recordSubmission,
  }),
  Controllers.handleSubmitRecords,
);

/**
 * GET
 *
 * @returns {Schemas.Dto.StudentAttendance.ProfessorView} for professors on success
 */
Routes.get(
  "/records/class/:classId/enrollment/:enrollmentId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId.extend(enrollmentId.shape),
    query: Schemas.RequestQuery.attendanceRecord,
  }),
  Controllers.handleViewRecords({
    allowedRoles: ["professor"],
    scope: "student",
    extractInput: (req) => {
      const { validated } = req as StrictValidatedRequest<
        Schemas.RequestParams.ClassId & Schemas.RequestParams.EnrollmentId,
        {},
        {},
        {}
      >;
      const { params } = validated;

      return { classId: params.classId, enrollmentId: params.enrollmentId };
    },
  }),
);

/**
 * POST
 * Only allows students for now.
 * @returns {Schemas.Dto.InsertedAttendance } for students on success
 */
Routes.post(
  "/new-rfid-scan",
  Auth.Core.Middlewares.validateJwt("minimal"),
  validateRequest({ body: Schemas.RequestBody.newRecord }),
  Controllers.handleNewRfidScan,
);
