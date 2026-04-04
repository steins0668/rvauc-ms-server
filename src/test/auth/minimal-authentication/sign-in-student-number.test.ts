import request from "supertest";
import { app } from "../../../app";
import { Json } from "../../../utils";
import { SessionBroker } from "../../../features/session-broker";

describe("POST /auth/minimal-authentication/sign-in", () => {
  const token: string = SessionBroker.Utils.Jwt.createToken();

  it("test with student number.", async () => {
    const creds = {
      method: "studentNumber",
      identifier: "101-0001",
    };

    const res = await request(app)
      .post("/auth/minimal-authentication/sign-in")
      .set("Authorization", `Bearer ${token}`)
      .send(creds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");

    console.log(JSON.stringify(res.body));

    const { success, result } = res.body;

    const data = success ? result : "";

    await Json.write({
      fileName: "minimal-authentication-student-number-token.json",
      data: { accessToken: data },
    });
  });

  it("test with RFID UID", async () => {
    const creds = {
      method: "rfidUid",
      identifier: "51 DC BE 97",
    };

    const res = await request(app)
      .post("/auth/minimal-authentication/sign-in")
      .set("Authorization", `Bearer ${token}`)
      .send(creds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");

    console.log(JSON.stringify(res.body));

    const { success, result } = res.body;

    const data = success ? result : "";

    await Json.write({
      fileName: "minimal-authentication-rfid-token.json",
      data: { accessToken: data },
    });
  });
});
