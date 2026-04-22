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

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("result");

    Schemas.Dto.ClassAttendance.professorView.parse(res.body.result);
  });

  //    403 class/session not associated with professor
  it("GET records/class/offering/session/156", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/156";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    404 class session not found
  it("GET records/class/offering/session/1000", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/1000";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    401 unauthorized
  it("GET records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app).get(url);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    403 forbidden
  it("GET records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.student}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    200 ok
  it("GET records/class/6", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/6")
      .set("Authorization", `Bearer ${tokens.student}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    Schemas.Dto.ClassAttendance.studentView.parse(res.body.result);
  });

  //    404 class not found
  it("GET records/class/7", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/7")
      .set("Authorization", `Bearer ${tokens.student}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    401 unauthorized
  it("GET records/class/6", async () => {
    const res = await request(app).get(
      "/enrollments/attendance/records/class/6",
    );

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //    403 forbidden
  it("GET records/class/6", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/6")
      .set("Authorization", `Bearer ${tokens.prof}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //  200 ok
  it("POST records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${tokens.prof}`)
      .send({
        records: [
          {
            //  * student id 7
            recordedDate: "2025-12-03T07:40:00+08:00",
            enrollmentId: 6,
            status: "late",
          },
          {
            //  * student id 8
            recordedDate: "2025-12-03T07:35:00+08:00",
            enrollmentId: 12,
            status: "late",
          },
          {
            //  * student id 9
            recordedDate: "2025-12-03T07:00:00+08:00",
            enrollmentId: 18,
            status: "absent",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toEqual(
      expect.objectContaining({
        result: { records: expect.any(Object) },
      }),
    );

    const { records } = res.body.result;

    const parsed = Schemas.Dto.ClassAttendance.mutationResult.parse(records);

    expect(parsed.rejected.length).toBe(0);
  });

  //  200 ok (one invalid enrollment id)
  it("POST records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${tokens.prof}`)
      .send({
        records: [
          {
            //  * student id 7
            recordedDate: "2025-12-03T07:40:00+08:00",
            enrollmentId: 100, //  invalid id
            status: "late",
          },
          {
            //  * student id 8
            recordedDate: "2025-12-03T07:35:00+08:00",
            enrollmentId: 12,
            status: "late",
          },
          {
            //  * student id 9
            recordedDate: "2025-12-03T07:00:00+08:00",
            enrollmentId: 18,
            status: "absent",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toEqual(
      expect.objectContaining({
        result: { records: expect.any(Object) },
      }),
    );

    const { records } = res.body.result;

    const parsed = Schemas.Dto.ClassAttendance.mutationResult.parse(records);

    expect(parsed.rejected.length).toBe(1);

    const rejected = parsed.rejected[0];
    expect(rejected?.record.enrollmentId).toBe(100);
    expect(rejected?.reasons).toContain("NOT_ENROLLED");
  });

  //  200 ok (one invalid date)
  it("POST records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${tokens.prof}`)
      .send({
        records: [
          {
            //  * student id 7
            recordedDate: "2025-12-03T12:40:00+08:00", //  invalid date
            enrollmentId: 6,
            status: "late",
          },
          {
            //  * student id 8
            recordedDate: "2025-12-03T07:35:00+08:00",
            enrollmentId: 12,
            status: "late",
          },
          {
            //  * student id 9
            recordedDate: "2025-12-03T07:00:00+08:00",
            enrollmentId: 18,
            status: "absent",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);
    expect(res.body).toEqual(
      expect.objectContaining({
        result: { records: expect.any(Object) },
      }),
    );

    const { records } = res.body.result;

    const parsed = Schemas.Dto.ClassAttendance.mutationResult.parse(records);

    expect(parsed.rejected.length).toBe(1);

    const rejected = parsed.rejected[0];
    expect(rejected?.record.enrollmentId).toBe(6);
    expect(rejected?.reasons).toContain("OUT_OF_SCHEDULE");
  });

  //  404 SESSION_NOT_FOUND
  it("POST records/class/offering/session/1000", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/1000";
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${tokens.prof}`)
      .send({
        records: [
          {
            //  * student id 7
            recordedDate: "2025-12-03T07:40:00+08:00",
            enrollmentId: 6,
            status: "late",
          },
          {
            //  * student id 8
            recordedDate: "2025-12-03T07:35:00+08:00",
            enrollmentId: 12,
            status: "late",
          },
          {
            //  * student id 9
            recordedDate: "2025-12-03T07:00:00+08:00",
            enrollmentId: 18,
            status: "absent",
          },
        ],
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //  401 unauthenticated
  it("POST records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .post(url)
      .send({
        records: [
          {
            //  * student id 7
            recordedDate: "2025-12-03T07:40:00+08:00",
            enrollmentId: 6,
            status: "late",
          },
          {
            //  * student id 8
            recordedDate: "2025-12-03T07:35:00+08:00",
            enrollmentId: 12,
            status: "late",
          },
          {
            //  * student id 9
            recordedDate: "2025-12-03T07:00:00+08:00",
            enrollmentId: 18,
            status: "absent",
          },
        ],
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  //  403 forbidden
  it("POST records/class/offering/session/157", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${tokens.student}`)
      .send({
        records: [
          {
            //  * student id 7
            recordedDate: "2025-12-03T07:40:00+08:00",
            enrollmentId: 6,
            status: "late",
          },
          {
            //  * student id 8
            recordedDate: "2025-12-03T07:35:00+08:00",
            enrollmentId: 12,
            status: "late",
          },
          {
            //  * student id 9
            recordedDate: "2025-12-03T07:00:00+08:00",
            enrollmentId: 18,
            status: "absent",
          },
        ],
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });
});
