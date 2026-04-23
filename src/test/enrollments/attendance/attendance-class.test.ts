import request from "supertest";
import { app } from "../../../app";
import { createJwt } from "../../../features/auth/core/utils/create-tokens.util/create-jwt.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";

describe("Class Attendance Test Suite", () => {
  const tokens = {
    prof: "",
    student: "",
    studentInvalid: "",
    professorInvalid: "",
  };

  beforeAll(async () => {
    tokens.prof = createJwt({
      payloadType: "full",
      tokenType: "access",
      payload: {
        id: 6,
        email: "bea.belarmino@lu.edu.ph",
        username: "BeaBela6",
        surname: "Belarmino",
        firstName: "Bea",
        gender: "female",
        contactNumber: "09171234506",
        middleName: "",
        role: "professor",
        college: "College of Computing Science",
        facultyRank: "professor",
      },
    });

    tokens.student = createJwt({
      payloadType: "full",
      tokenType: "access",
      payload: {
        id: 7,
        email: "lee.agaton@gmail.com",
        username: "LeeA7",
        surname: "Agaton",
        firstName: "Lee Archelaus",
        gender: "male",
        contactNumber: "09171234507",
        middleName: "",
        role: "student",
        department: "Department Of Computer Science",
        studentNumber: "101-0001",
        yearLevel: 3,
        block: "A",
      },
    });

    tokens.studentInvalid = createJwt({
      payloadType: "full",
      tokenType: "access",
      payload: {
        id: 999,
        email: "lee.agaton@gmail.com",
        username: "LeeA7",
        surname: "Agaton",
        firstName: "Lee Archelaus",
        gender: "male",
        contactNumber: "09171234507",
        middleName: "",
        role: "student",
        department: "Department Of Computer Science",
        studentNumber: "101-0001",
        yearLevel: 3,
        block: "A",
      },
    });

    tokens.professorInvalid = createJwt({
      payloadType: "full",
      tokenType: "access",
      payload: {
        id: 1000,
        email: "bea.belarmino@lu.edu.ph",
        username: "BeaBela6",
        surname: "Belarmino",
        firstName: "Bea",
        gender: "female",
        contactNumber: "09171234506",
        middleName: "",
        role: "professor",
        college: "College of Computing Science",
        facultyRank: "professor",
      },
    });
  });

  it(`GET session records (professor view) - success`, async () => {
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

  it("GET session records (professor view) - forbidden | unassociated class session", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/156";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET session records (professor view) - forbidden | unassociated class session | invalid professor", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.professorInvalid}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET session records (professor view) - class session not found", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/1000";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.prof}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET session records (professor view) - unauthorized | no token", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app).get(url);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET session records (professor view) - forbidden | student", async () => {
    const url = "/enrollments/attendance/records/class/offering/session/157";
    const res = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${tokens.student}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET class records (student view) - success", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/6")
      .set("Authorization", `Bearer ${tokens.student}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    Schemas.Dto.ClassAttendance.studentView.parse(res.body.result);
  });

  it("GET class records (student view) - class not found", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/7")
      .set("Authorization", `Bearer ${tokens.student}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET class records (student view) - student not found", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/6")
      .set("Authorization", `Bearer ${tokens.studentInvalid}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET class records (student view) - unauthorized | no token", async () => {
    const res = await request(app).get(
      "/enrollments/attendance/records/class/6",
    );

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("GET class records (student view) - forbidden | professor", async () => {
    const res = await request(app)
      .get("/enrollments/attendance/records/class/6")
      .set("Authorization", `Bearer ${tokens.prof}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(false);
  });

  it("POST session records (professor) - success", async () => {
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

  it("POST session records (professor) - success | invalid enrollment id", async () => {
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

  it("POST session records (professor) - success | invalid date", async () => {
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

  it("POST session records (professor) - class session not found", async () => {
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

  it("POST session records (professor) - unauthorized | no token", async () => {
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

  it("POST session records (professor) - forbidden | student", async () => {
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
