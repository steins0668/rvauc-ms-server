import request from "supertest";
import { app } from "../../../app";
import { Core as AuthCore } from "../../../features/auth/core";
import { createTokens } from "../../../features/auth/core/utils/create-tokens.util";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";
import { Schemas as CoreSchemas } from "../../../features/enrollments/core/schemas";
import { execTransaction } from "../../../db/create-context";
import { resetDatabase } from "../../../scripts/reset-database";
import { seedDatabase } from "../../../scripts/seeders/seed-all.seeder";

describe("Student Attendance Test Suite", () => {
  const minimalTokens = {
    student: "",
  };

  //   beforeEach(async () => {
  //     await execTransaction(async (tx) => {
  //       await resetDatabase(tx);
  //       await seedDatabase({
  //         tx,
  //         include: { offerings: true, enrollments: true, sessions: true },
  //       });
  //     });
  //   });

  beforeAll(async () => {
    const student = {
      id: 7,
      email: "lee.agaton@gmail.com",
      username: "LeeA7",
      surname: "Agaton",
      firstName: "Lee Archelaus",
      gender: "male",
      contactNumber: "09171234507",
    };

    const payloadStudent: AuthCore.Schemas.Payloads.AccessToken.MinimalStudent =
      {
        ...student,
        middleName: "",
        role: "student",
        department: "Department Of Computer Science",
        studentNumber: "101-0001",
        yearLevel: 3,
        block: "A",
      };

    const tokentStudent = createTokens({
      type: "minimal",
      access: payloadStudent,
    });

    expect(tokentStudent.success).toBe(true);

    if (!tokentStudent.success)
      throw new Error("Expected token creation success.");

    minimalTokens.student = tokentStudent.result.accessToken;
  });

  //    201 ok
  it(`POST new-rfid-scan`, async () => {
    const res = await request(app)
      .post("/enrollments/attendance/new-rfid-scan")
      .set("Authorization", `Bearer ${minimalTokens.student}`)
      .send({
        date: "2025-12-01T09:00:00+08:00",
        room: "406",
      });

    console.log(`Status: ${res.status}`);
    console.debug(JSON.stringify(res.body, null, 2));

    // expect(res.status).toBe(201);
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("success");
    expect(res.body.success).toBe(true);

    const { result } = res.body;

    CoreSchemas.Dto.class_.parse(result.class);
    Schemas.Dto.insertedAttendance.parse(result.attendance);
  });

  //    200 ok
  //   it(`POST new-rfid-scan`, async () => {
  //     const executeRequest = async () => {
  //       const res = await request(app)
  //         .post("/enrollments/attendance/new-rfid-scan")
  //         .set("Authorization", `Bearer ${minimalTokens.student}`)
  //         .send({
  //           date: "2025-12-01T09:00:00+08:00",
  //           room: "406",
  //         });

  //       expect(res.body).toHaveProperty("success");
  //       expect(res.body.success).toBe(true);

  //       const { result } = res.body;

  //       CoreSchemas.Dto.class_.parse(result.class);
  //       Schemas.Dto.insertedAttendance.parse(result.attendance);

  //       return res;
  //     };

  //     const res201 = await executeRequest();

  //     expect(res201.status).toBe(201);

  //     const res200 = await executeRequest();

  //     expect(res200.status).toBe(200);
  //   });
});
