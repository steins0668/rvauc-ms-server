import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../app";
import { Authentication } from "../../../features/auth/core/services/authentication.service";
import { payloadResolver } from "../../../features/auth/core/utils/payload-resolver.util";
import { UserData } from "../../../features/auth/core/services/user-data.service";
import { SessionManager } from "../../../features/auth/sub-features/session-management/services/session-manager";
import { createTokens } from "../../../features/auth/core/utils/create-tokens.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";
import { Schemas as CoreSchemas } from "../../../features/enrollments/core/schemas";

const classId = 6;
const classOfferingId = 7;
const studentId = 7;

describe("Attendance Test Suite", () => {
  const tokens = {
    student: "",
    professor: "",
  };

  const minimalTokens = {
    student: "",
  };

  beforeAll(async () => {
    const credentials = [
      { identifier: "bea.belarmino@lu.edu.ph", role: "professor" },
      { identifier: "101-0001", role: "student" },
    ] as const;

    const getToken = async (
      person: (typeof credentials)[number],
      type: "full" | "minimal",
    ) => {
      const authentication = await Authentication.createService().then(
        async (s) =>
          s.authenticate({
            type: "session",
            identifier: person.identifier,
          }),
      );

      expect(authentication.success).toBe(true);

      if (!authentication.success)
        throw new Error("Expected authentication success.");

      const { result: user } = authentication;

      const createAccessPayload = await payloadResolver[person.role]({
        type: type as any,
        dataService: await UserData.createService(),
        user,
      });

      expect(createAccessPayload.success).toBe(true);

      if (!createAccessPayload.success)
        throw new Error("Expected payload creation success.");

      const sessionManager = await SessionManager.createService();

      const sessionNumber = sessionManager.generateSessionNumber(user.id);

      const tknCreation = createTokens({
        type: type as any,
        access: createAccessPayload.result,
        refresh: {
          sessionNumber,
          userId: user.id,
          jti: randomUUID(),
        },
      });

      expect(tknCreation.success).toBe(true);

      if (!tknCreation.success)
        throw new Error("Expected token creation success.");

      const { result } = tknCreation;

      return result.accessToken;
    };

    for (const c of credentials) tokens[c.role] = await getToken(c, "full");

    minimalTokens.student = await getToken(credentials[1], "minimal");
  });

  const params = new URLSearchParams({
    timeMs: new Date("2025-12-03T11:00:00+08:00").getTime().toString(),
  });
  const reqQuery = params.toString();

  it(`GET records/class/${classId}?${reqQuery}`, async () => {
    const res = await request(app)
      .get(`/enrollments/attendance/records/class/${classId}?${reqQuery}`)
      .set("Authorization", `Bearer ${tokens.professor}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    Schemas.Dto.ClassAttendance.professorView.parse(res.body.result);
  });

  it(`GET records/class/${classId}/student/${studentId}`, async () => {
    const url = `/enrollments/attendance/records/class/${classId}/student/${studentId}`;
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.professor}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("result");

    Schemas.Dto.StudentAttendance.professorView.parse(res.body.result);
  });

  it(`POST records/class/${classId}/class-offering/${classOfferingId}`, async () => {
    const url = `/enrollments/attendance/records/class/${classId}/class-offering/${classOfferingId}`;
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${tokens.professor}`)
      .send({
        date: "2025-12-03T07:00:00+08:00",
        records: [
          {
            recordedDate: "2025-12-03T07:40:00+08:00",
            studentId: 7,
            status: "late",
          },
          {
            recordedDate: "2025-12-03T07:35:00+08:00",
            studentId: 8,
            status: "late",
          },
          {
            recordedDate: "2025-12-03T07:00:00+08:00",
            studentId: 9,
            status: "absent",
          },
        ],
      });

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toEqual(
      expect.objectContaining({
        result: { records: expect.any(Object) },
      }),
    );

    Schemas.Dto.ClassAttendance.mutationResult.parse(res.body.result.records);
  });

  it(`GET records/class/${classId}`, async () => {
    const res = await request(app)
      .get(`/enrollments/attendance/records/class/${classId}`)
      .set("Authorization", `Bearer ${tokens.student}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    Schemas.Dto.ClassAttendance.studentView.parse(res.body.result);
  });

  it(`POST new-rfid-scan`, async () => {
    const res = await request(app)
      .post("/enrollments/attendance/new-rfid-scan")
      .set("Authorization", `Bearer ${minimalTokens.student}`)
      .send({
        date: "2025-12-01T09:00:00+08:00",
        room: "406",
      });

    console.debug(JSON.stringify(res.body, null, 2));

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    const { result } = res.body;

    CoreSchemas.Dto.class_.parse(result.class);
    Schemas.Dto.insertedAttendance.parse(result.attendance);
  });
});
