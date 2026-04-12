import { Server } from "http";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../../app";
import { Data as SessionBrokerData } from "../../../features/session-broker/data";

describe("POST /session-broker/sign-in", () => {
  let server: Server;
  beforeAll(() => {
    server = app.listen(2620, "0.0.0.0");
  });

  const stationName = "406";

  const token = jwt.sign(
    { stationName },
    SessionBrokerData.Env.getStationSecret(),
  );

  it("test with student number.", async () => {
    const creds = {
      method: "studentNumber",
      identifier: "101-0001",
      stationName,
    };

    const res = await request(app)
      .post("/session-broker/sign-in")
      .set("Authorization", `Bearer ${token}`)
      .send(creds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
  });

  afterAll(() => {
    server.close();
  });
});
