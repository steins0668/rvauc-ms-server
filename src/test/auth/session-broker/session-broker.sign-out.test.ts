import { Server } from "http";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../../app";
import { Data as SessionBrokerData } from "../../../features/session-broker/data";

const stationName = "406";

describe(`POST /session-broker/sign-out/${stationName}`, () => {
  it("test sign out.", async () => {
    const token = jwt.sign(
      { stationName },
      SessionBrokerData.Env.getStationSecret(),
    );

    const res = await request(app)
      .post(`/session-broker/sign-out/${stationName}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
