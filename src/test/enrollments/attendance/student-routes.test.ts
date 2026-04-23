import request from "supertest";
import { app } from "../../../app";
import { createJwt } from "../../../features/auth/core/utils/create-tokens.util/create-jwt.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";

describe("Student Attendance Routes", () => {
  const tokens = {
    prof: "",
    student: "",
    profInvalid: "",
    studentInvalid: "",
  };

  const ids = {
    class: {
      prof: {
        valid: 6,
        notFound: 100,
      },
    },
    enrollment: {
      prof: {
        valid: 6,
        notFound: 100,
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

  describe("GET student records", () => {
    describe("as professor", () => {
      it("should return records", async () => {
        const c = ids.class.prof.valid;
        const e = ids.enrollment.prof.valid;
        const url = `/enrollments/attendance/records/class/${c}/enrollment/${e}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty("result");

        Schemas.Dto.StudentAttendance.professorView.parse(res.body.result);
      });

      it("should return 403 for non-existent class", async () => {
        const c = ids.class.prof.notFound;
        const e = ids.enrollment.prof.valid;
        const url = `/enrollments/attendance/records/class/${c}/enrollment/${e}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 403 for non-existent enrollment", async () => {
        const c = ids.class.prof.valid;
        const e = ids.enrollment.prof.notFound;
        const url = `/enrollments/attendance/records/class/${c}/enrollment/${e}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.prof}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });

    describe("authorization", () => {
      it("should return 401 for missing token", async () => {
        const c = ids.class.prof.valid;
        const e = ids.enrollment.prof.valid;
        const url = `/enrollments/attendance/records/class/${c}/enrollment/${e}`;
        const res = await request(app).get(url);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it("should return 403 for student", async () => {
        const c = ids.class.prof.valid;
        const e = ids.enrollment.prof.valid;
        const url = `/enrollments/attendance/records/class/${c}/enrollment/${e}`;
        const res = await request(app)
          .get(url)
          .set("Authorization", `Bearer ${tokens.student}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });
  });
});
