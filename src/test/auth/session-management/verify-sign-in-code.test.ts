import crypto from "crypto";
import request from "supertest";
import { app } from "../../../app";
import { Authentication } from "../../../features/auth/core/services/authentication.service";
import { SignInRequest } from "../../../features/auth/sub-features/session-management/services/sign-in-request.service";

describe("Verify sign-in code", () => {
  const reqBody = {
    email: "bea.belarmino@lu.edu.ph",
    code: "",
  };

  beforeAll(async () => {
    const verificationResult = await Authentication.createService().then(
      async (s) =>
        s.authenticate({
          type: "password",
          identifier: "bea.belarmino@lu.edu.ph",
          password: "Password6!",
        }),
    );

    expect(verificationResult.success).toBe(true);

    if (!verificationResult.success)
      throw new Error("Expected verification success.");

    const { result } = verificationResult;

    const code = (crypto.randomBytes(4).readUint32BE(0) % 1000000)
      .toString()
      .padStart(6, "0");

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    const codeCreation = await SignInRequest.createService().then(async (s) =>
      s.storeNewRequest(result.id, codeHash),
    );

    expect(codeCreation.success).toBe(true);

    if (!codeCreation.success)
      throw new Error("Expected code creation success.");

    reqBody.code = code;
  });

  it("should return 200", async () => {
    const res = await request(app)
      .post("/auth/session-management/verify-code")
      .send(reqBody);

    console.debug(JSON.stringify(res.body));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        result: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      }),
    );
  });
});
