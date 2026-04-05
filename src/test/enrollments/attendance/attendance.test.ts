import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../app";
import { Authentication } from "../../../features/auth/core/services/authentication.service";
import { payloadResolver } from "../../../features/auth/core/utils/payload-resolver.util";
import { UserData } from "../../../features/auth/core/services/user-data.service";
import { SessionManager } from "../../../features/auth/sub-features/session-management/services/session-manager";
import { createTokens } from "../../../features/auth/core/utils/create-tokens.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";

const classId = 6;
const classOfferingId = 7;
const studentId = 7;

describe("Attendance Test Suite", () => {
  let accessToken: string;

  beforeAll(async () => {
    const authentication = await Authentication.createService().then(
      async (s) =>
        s.authenticate({
          type: "session",
          identifier: "bea.belarmino@lu.edu.ph",
        }),
    );

    expect(authentication.success).toBe(true);

    if (!authentication.success)
      throw new Error("Expected authentication success.");

    const { result: user } = authentication;

    const createAccessPayload = await payloadResolver["professor"]({
      type: "full",
      dataService: await UserData.createService(),
      user,
    });

    expect(createAccessPayload.success).toBe(true);

    if (!createAccessPayload.success)
      throw new Error("Expected payload creation success.");

    const sessionManager = await SessionManager.createService();

    const sessionNumber = sessionManager.generateSessionNumber(user.id);

    const tknCreation = createTokens({
      type: "full",
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
    accessToken = result.accessToken;
  });

  it(`GET records/class/${classId}`, async () => {
    const res = await request(app)
      .get(`/enrollments/attendance/records/class/${classId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    console.debug(JSON.stringify(res.body));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    Schemas.Dto.ClassAttendance.professorView.parse(res.body.result);
  });

  it(`GET records/class/${classId}/student/${studentId}`, async () => {
    const url = `/enrollments/attendance/records/class/${classId}/student/${studentId}`;
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${accessToken}`);

    console.debug(JSON.stringify(res.body));

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
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        date: "2026-04-08T07:00:00+08:00",
        records: [
          {
            recordedDate: "2026-04-08T07:40:00+08:00",
            studentId: 7,
            status: "late",
          },
          {
            recordedDate: "2026-04-08T07:35:00+08:00",
            studentId: 8,
            status: "late",
          },
          {
            recordedDate: "2026-04-08T07:00:00+08:00",
            studentId: 9,
            status: "absent",
          },
        ],
      });

    console.debug(JSON.stringify(res.body));

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
});
