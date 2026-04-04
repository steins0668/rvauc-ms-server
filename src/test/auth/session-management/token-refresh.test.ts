import request from "supertest";
import { app } from "../../../app";
import { Json } from "../../../utils";

describe("POST /auth/session-management/refresh", () => {
  const reqBody = {
    refreshToken: "",
  };

  it("should return 200", async () => {
    reqBody.refreshToken = await Json.read<{
      accessToken: string;
      refreshToken: string;
    }>({
      fileName: "tokens.json",
    }).then((r) => r.refreshToken);

    console.log(JSON.stringify(reqBody));

    const res = await request(app)
      .post("/auth/session-management/refresh")
      .send(reqBody);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");

    console.log(res.body);

    const { success, result } = res.body;

    const data = success
      ? { accessToken: result.accessToken, refreshToken: result.refreshToken }
      : { accessToken: "", refreshToken: "" };
    await Json.write({ fileName: "tokens.json", data });
  });
});
