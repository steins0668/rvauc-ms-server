import request from "supertest";
import { app } from "../../../app";
import { createJwt } from "../../../features/auth/core/utils/create-tokens.util/create-jwt.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";

describe("Class Attendance Routes", () => {
  const tokens = {
    prof: "",
    student: "",
    profInvalid: "",
    studentInvalid: "",
  };

  const ids = {
    class: {
      student: {
        valid: 6,
        notFound: 7,
      },
    },
    session: {
      professor: {
        valid: 157,
        invalid: 156,
        notFound: 1000,
      },
      student: {
        valid: 0,
        invalid: 0,
      },
    },
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

    tokens.profInvalid = createJwt({
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

  describe("GET session records)", () => {
    describe("as professor", () => {
      it(`should return records for associated session`, async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty("result");

        Schemas.Dto.ClassAttendance.professorView.parse(res.body.result);
      });

      it("should return 403 for unassociated class session", async () => {
        const id = ids.session.professor.invalid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 403 for invalid professor", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.profInvalid}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 404 for class session not found", async () => {
        const id = ids.session.professor.notFound;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });

    describe("authorization", () => {
      it("should return 401 for missing token.", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app).get(url);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 403 for student", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.student}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe("GET class records", () => {
    describe("as student", () => {
      it("should return records", async () => {
        const id = ids.class.student.valid;
        const res = await request(app)
          .get(`/enrollments/attendance/records/class/${id}`)
          .set("Authorization", `Bearer ${tokens.student}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(true);

        Schemas.Dto.ClassAttendance.studentView.parse(res.body.result);
      });

      it("should return 404 for class not found", async () => {
        const id = ids.class.student.notFound;
        const res = await request(app)
          .get(`/enrollments/attendance/records/class/${id}`)
          .set("Authorization", `Bearer ${tokens.student}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 404 for student not found", async () => {
        const id = ids.class.student.valid;
        const res = await request(app)
          .get(`/enrollments/attendance/records/class/${id}`)
          .set("Authorization", `Bearer ${tokens.studentInvalid}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });

    describe("authorization", () => {
      it("should return 401 for missing token", async () => {
        const id = ids.class.student.valid;
        const res = await request(app).get(
          `/enrollments/attendance/records/class/${id}`,
        );

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 403 for professor", async () => {
        const id = ids.class.student.valid;
        const res = await request(app)
          .get(`/enrollments/attendance/records/class/${id}`)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe("POST session records", () => {
    describe("as professor", () => {
      it("should create records", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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

        const parsed =
          Schemas.Dto.ClassAttendance.mutationResult.parse(records);

        expect(parsed.rejected.length).toBe(0);
      });

      it("should partially reject invalid enrollment id", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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

        const parsed =
          Schemas.Dto.ClassAttendance.mutationResult.parse(records);

        expect(parsed.rejected.length).toBe(1);

        const rejected = parsed.rejected[0];
        expect(rejected?.record.enrollmentId).toBe(100);
        expect(rejected?.reasons).toContain("NOT_ENROLLED");
      });

      it("should partially reject out of schedule date", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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

        const parsed =
          Schemas.Dto.ClassAttendance.mutationResult.parse(records);

        expect(parsed.rejected.length).toBe(1);

        const rejected = parsed.rejected[0];
        expect(rejected?.record.enrollmentId).toBe(6);
        expect(rejected?.reasons).toContain("OUT_OF_SCHEDULE");
      });

      it("should return 404 for class session not found", async () => {
        const id = ids.session.professor.notFound;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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

      it("should return 403 for unassociated class session", async () => {
        const id = ids.session.professor.invalid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 403 for invalid professor", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
        const res = await request(app)
          .post(url)
          .set("Authorization", `Bearer ${tokens.profInvalid}`)
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

    describe("authorization", () => {
      it("should return 401 for missing token", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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

      it("should return 403 for student", async () => {
        const id = ids.session.professor.valid;
        const url = `/enrollments/attendance/records/class/offering/session/${id}`;
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
  });
});
