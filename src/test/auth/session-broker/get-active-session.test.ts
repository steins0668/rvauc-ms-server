import { Server } from "http";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../../app";
import { Json } from "../../../utils";
import { Data as SessionBrokerData } from "../../../features/session-broker/data";

const stationName = "406";

describe(`GET /session-broker/get-active-session/${stationName}`, () => {
  let server: Server;
  beforeAll(() => {
    server = app.listen(2620, "0.0.0.0");
  });

  it("test active session", async () => {
    const token = jwt.sign(
      { stationName },
      SessionBrokerData.Env.getStationSecret(),
    );

    const res = await request(app)
      .get(`/session-broker/get-active-session/${stationName}`)
      .set("Authorization", `Bearer ${token}`);

    console.log(JSON.stringify(res.body));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
  });

  afterAll(() => {
    server.close();
  });
});
