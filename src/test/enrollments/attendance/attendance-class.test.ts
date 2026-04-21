import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../app";
import { Core as AuthCore } from "../../../features/auth/core";
import { SessionManager } from "../../../features/auth/sub-features/session-management/services/session-manager";
import { createTokens } from "../../../features/auth/core/utils/create-tokens.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";

describe("Class Attendance Test Suite", () => {
  const tokens = {
    prof: "",
    student: "",
  };

  beforeAll(async () => {
    const sessionManager = await SessionManager.createService();

    const prof = {
      id: 6,
      roleId: 1,
      email: "bea.belarmino@lu.edu.ph",
      username: "BeaBela6",
      surname: "Belarmino",
      firstName: "Bea",
      gender: "female",
      contactNumber: "09171234506",
    };

    const payloadProf: AuthCore.Schemas.Payloads.AccessToken.Professor = {
      ...prof,
      middleName: "",
      role: "professor",
      college: "College of Computing Science",
      facultyRank: "professor",
    };

    const sessionNumberProf = sessionManager.generateSessionNumber(prof.id);

    const tokenProf = createTokens({
      type: "full",
      access: payloadProf,
      refresh: {
        sessionNumber: sessionNumberProf,
        userId: prof.id,
        jti: randomUUID(),
      },
    });

    expect(tokenProf.success).toBe(true);

    if (!tokenProf.success) throw new Error("Expected token creation success.");

    tokens.prof = tokenProf.result.accessToken;

    const student = {
      id: 7,
      email: "lee.agaton@gmail.com",
      username: "LeeA7",
      surname: "Agaton",
      firstName: "Lee Archelaus",
      gender: "male",
      contactNumber: "09171234507",
    };

    const payloadStudent: AuthCore.Schemas.Payloads.AccessToken.Student = {
      ...student,
      middleName: "",
      role: "student",
      department: "Department Of Computer Science",
      studentNumber: "101-0001",
      yearLevel: 3,
      block: "A",
    };

    const sessionNumberStudent = sessionManager.generateSessionNumber(
      student.id,
    );

    const tokentStudent = createTokens({
      type: "full",
      access: payloadStudent,
      refresh: {
        sessionNumber: sessionNumberStudent,
        userId: student.id,
        jti: randomUUID(),
      },
    });

    expect(tokentStudent.success).toBe(true);

    if (!tokentStudent.success)
      throw new Error("Expected token creation success.");

    tokens.student = tokentStudent.result.accessToken;
  });

  //    200 ok
  it(`GET records/class/offering/session/157`, async () => {
    const url = `/enrollments/attendance/records/class/offering/session/157`;
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("result");

    Schemas.Dto.ClassAttendance.professorView.parse(res.body.result);
  });

  //    403 class/session not associated with professor
  it(`GET records/class/offering/session/156`, async () => {
    const url = `/enrollments/attendance/records/class/offering/session/156`;
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    404 class not found
  it(`GET records/class/offering/session/1000`, async () => {
    const url = `/enrollments/attendance/records/class/offering/session/1000`;
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    200 ok
  it(`GET records/class/6`, async () => {
    const res = await request(app)
      .get(`/enrollments/attendance/records/class/6`)
      .set("Authorization", `Bearer ${tokens.student}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    Schemas.Dto.ClassAttendance.studentView.parse(res.body.result);
  });

  //    404 enrollment not found
  it(`GET records/class/7`, async () => {
    const res = await request(app)
      .get(`/enrollments/attendance/records/class/7`)
      .set("Authorization", `Bearer ${tokens.student}`);

    console.debug(JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });
});
