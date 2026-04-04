import request from "supertest";
import { app } from "../../app";

describe("POST /auth/session-management/sign-in", () => {
  const creds = {
    identifier: "bea.belarmino@lu.edu.ph",
    deviceToken:
      "eyv2KKaivCUxDEzMB_L5gO:APA91bHGGTUHIUhCOLylz2YgUqsnpVImYe3iTQ02kdWQoOShAK395dsOlpkCb1rNfMnwE2H2wAVUt5a0PQkxL99Mp22tF0a870uMsfit0e339GKMYWe4OJA",
    password: "Password6!",
  };

  it("should return 200", async () => {
    const res = await request(app)
      .post("/auth/session-management/sign-in")
      .send(creds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
  });
});
