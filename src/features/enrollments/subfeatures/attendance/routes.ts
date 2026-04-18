import { Router } from "express";
import { StrictValidatedRequest } from "../../../../interfaces";
import { validateRequest } from "../../../../middlewares";
import { Auth } from "../../../auth";
import { Schemas } from "./schemas";
import { Controllers } from "./controllers";
import { Middlewares } from "./middlewares";

const { classId, classOfferingId, classSessionId, studentId } =
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
 * @returns {import("../../core/schemas").Dto.ClassSessions}
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
 * @returns {import("./schemas").Schemas.Dto.ClassAttendance.StudentView} for students
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
 * @returns {import("./schemas").Schemas.Dto.ClassAttendance.ProfessorView} for professors
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
 * GET
 *
 * @returns {import('./schemas').Schemas.Dto.StudentAttendance.ProfessorView} for professors
 */
Routes.get(
  "/records/class/:classId/student/:studentId",
  Auth.Core.Middlewares.validateJwt("full"),
  validateRequest({
    params: classId.extend(studentId.shape),
    query: Schemas.RequestQuery.attendanceRecord,
  }),
  Controllers.handleViewRecords({
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

/**
 * POST
 * Only allows professors for now.
 * @returns {import('./schemas').Schemas.Dto.ClassAttendance.MutationResult } for professors
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
 * POST
 * Only allows students for now.
 * @returns {import('./schemas').Schemas.Dto.InsertedAttendance } for students.
 */
Routes.post(
  "/new-rfid-scan",
  Auth.Core.Middlewares.validateJwt("minimal"),
  validateRequest({ body: Schemas.RequestBody.newRecord }),
  Controllers.handleNewRfidScan,
);
