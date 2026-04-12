import request from "supertest";
import { app } from "../../../app";
import { SessionBroker } from "../../../features/session-broker";

describe("POST /auth/minimal-authentication/sign-in", () => {
  it("test with student number.", async () => {
    const token: string = SessionBroker.Utils.Jwt.createToken();

    const creds = {
      method: "studentNumber",
      identifier: "101-0001",
    };

    const res = await request(app)
      .post("/auth/minimal-authentication/sign-in")
      .set("Authorization", `Bearer ${token}`)
      .send(creds);

    console.debug(JSON.stringify(res.body));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        result: expect.any(String),
      }),
    );
  });

  it("test with RFID UID", async () => {
    const token: string = SessionBroker.Utils.Jwt.createToken();

    const creds = {
      method: "rfidUid",
      identifier: "51 DC BE 97",
    };

    const res = await request(app)
      .post("/auth/minimal-authentication/sign-in")
      .set("Authorization", `Bearer ${token}`)
      .send(creds);

    console.debug(JSON.stringify(res.body));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        result: expect.any(String),
      }),
    );
  });
});
