import request from "supertest";
import { app } from "../../../app";
import { createJwt } from "../../../features/auth/core/utils/create-tokens.util/create-jwt.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";
import { Schemas as CoreSchemas } from "../../../features/enrollments/core/schemas";

describe("RFID Scan Route", () => {
  const minimalTokens = {
    student: "",
  };

  const tokens = {
    student: "",
    prof: "",
  };

  beforeAll(async () => {
    minimalTokens.student = createJwt({
      tokenType: "access",
      payloadType: "minimal",
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
  });

  describe("POST rfid scan", () => {
    describe("as student(minimal token type)", () => {
      it(`should return 201 for new attendance record`, async () => {
        const res = await request(app)
          .post("/enrollments/attendance/new-rfid-scan")
          .set("Authorization", `Bearer ${minimalTokens.student}`)
          .send({
            date: "2025-12-01T09:00:00+08:00",
            room: "406",
          });

        console.log(`Status: ${res.status}`);
        console.debug(JSON.stringify(res.body, null, 2));

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(true);

        const { result } = res.body;

        CoreSchemas.Dto.class_.parse(result.class);
        Schemas.Dto.insertedAttendance.parse(result.attendance);
      });

      it(`should return 200 for duplicate record`, async () => {
        const res = await request(app)
          .post("/enrollments/attendance/new-rfid-scan")
          .set("Authorization", `Bearer ${minimalTokens.student}`)
          .send({
            date: "2025-12-01T09:00:00+08:00",
            room: "406",
          });

        console.log(`Status: ${res.status}`);
        console.debug(JSON.stringify(res.body, null, 2));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(true);

        const { result } = res.body;

        CoreSchemas.Dto.class_.parse(result.class);
        Schemas.Dto.insertedAttendance.parse(result.attendance);
      });
    });

    describe("authorization", () => {
      it(`should return 401 for missing token`, async () => {
        const res = await request(app)
          .post("/enrollments/attendance/new-rfid-scan")
          .send({
            date: "2025-12-01T09:00:00+08:00",
            room: "406",
          });

        console.log(`Status: ${res.status}`);
        console.debug(JSON.stringify(res.body, null, 2));

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it(`should return 401 for student(full token type)`, async () => {
        const res = await request(app)
          .post("/enrollments/attendance/new-rfid-scan")
          .set("Authorization", `Bearer ${tokens.student}`)
          .send({
            date: "2025-12-01T09:00:00+08:00",
            room: "406",
          });

        console.log(`Status: ${res.status}`);
        console.debug(JSON.stringify(res.body, null, 2));

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });

      it(`should return 401 for professor(full token type)`, async () => {
        const res = await request(app)
          .post("/enrollments/attendance/new-rfid-scan")
          .set("Authorization", `Bearer ${tokens.prof}`)
          .send({
            date: "2025-12-01T09:00:00+08:00",
            room: "406",
          });

        console.log(`Status: ${res.status}`);
        console.debug(JSON.stringify(res.body, null, 2));

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("success");
        expect(res.body.success).toBe(false);
      });
    });
  });
});
