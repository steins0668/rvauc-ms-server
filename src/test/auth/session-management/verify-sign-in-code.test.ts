import request from "supertest";
import { app } from "../../../app";
import { Json } from "../../../utils";

describe("POST /auth/session-management/verify-code", () => {
  const reqBody = {
    email: "bea.belarmino@lu.edu.ph",
    code: "",
  };

  it("should return 200", async () => {
    reqBody.code = await Json.read<{ code: string }>({
      fileName: "codes.json",
    }).then((v) => v.code);

    const res = await request(app)
      .post("/auth/session-management/verify-code")
      .send(reqBody);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");

    console.log(res.body);

    const { success, result } = res.body;

    const data = success
      ? { accessToken: result.accessToken, refreshToken: result.refreshToken }
      : { accessToken: "", refreshToken: "" };
    await Json.write({ fileName: "session-management-tokens.json", data });
  });
});
