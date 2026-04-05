import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../app";
import { Authentication } from "../../../features/auth/core/services/authentication.service";
import { payloadResolver } from "../../../features/auth/core/utils/payload-resolver.util";
import { UserData } from "../../../features/auth/core/services/user-data.service";
import { SessionManager } from "../../../features/auth/sub-features/session-management/services/session-manager";
import { createTokens } from "../../../features/auth/core/utils/create-tokens.util";

describe("Token refresh", () => {
  const reqBody = {
    refreshToken: "",
  };

  beforeAll(async () => {
    const authentication = await Authentication.createService().then(
      async (s) =>
        s.authenticate({
          type: "session",
          identifier: "bea.belarmino@lu.edu.ph",
        }),
    );

    expect(authentication.success).toBe(true);

    if (!authentication.success)
      throw new Error("Expected authentication success.");

    const { result: user } = authentication;

    const createAccessPayload = await payloadResolver["professor"]({
      type: "full",
      dataService: await UserData.createService(),
      user,
    });

    expect(createAccessPayload.success).toBe(true);

    if (!createAccessPayload.success)
      throw new Error("Expected payload creation success.");

    const sessionManager = await SessionManager.createService();

    const sessionNumber = sessionManager.generateSessionNumber(user.id);

    const tknCreation = createTokens({
      type: "full",
      access: createAccessPayload.result,
      refresh: {
        sessionNumber,
        userId: user.id,
        jti: randomUUID(),
      },
    });

    expect(tknCreation.success).toBe(true);

    if (!tknCreation.success)
      throw new Error("Expected token creation success.");

    const { refreshToken } = tknCreation.result;

    const sessionResult = await sessionManager.startSession({
      sessionNumber,
      userId: user.id,
      refreshToken,
      expiresAt: null,
    });

    expect(sessionResult.success).toBe(true);

    if (!sessionResult.success)
      throw new Error("Expected session start success.");

    reqBody.refreshToken = refreshToken;
  });

  it("should return 200", async () => {
    const res = await request(app)
      .post("/auth/session-management/refresh")
      .send(reqBody);

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
