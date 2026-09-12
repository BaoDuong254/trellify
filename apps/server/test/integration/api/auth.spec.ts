import JWT from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";

import environmentConfig from "src/config/environment";
import { userModel } from "src/models/user.model";
import { TEST_PASSWORD, createActiveUser, getApp } from "test/integration/helpers";

const cookiesOf = (header: unknown): string[] => (Array.isArray(header) ? (header as string[]) : []);

describe("POST /api/v1/users/login", () => {
  it("sets httpOnly access and refresh cookies and never returns the password", async () => {
    const user = await createActiveUser("someone");

    const response = await request(getApp())
      .post("/api/v1/users/login")
      .send({ email: user.email, password: TEST_PASSWORD, turnstileToken: "test-token" })
      .expect(200);

    const cookies = cookiesOf(response.headers["set-cookie"]);
    expect(cookies.some((cookie) => cookie.startsWith("accessToken=") && cookie.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("refreshToken=") && cookie.includes("HttpOnly"))).toBe(true);
    expect(response.body.data).not.toHaveProperty("password");
    expect(response.body.data).not.toHaveProperty("verifyToken");
  });

  it("answers 401 for a wrong password", async () => {
    const user = await createActiveUser("someone");

    await request(getApp())
      .post("/api/v1/users/login")
      .send({ email: user.email, password: "WrongPassword1", turnstileToken: "test-token" })
      .expect(401);
  });

  it("refuses an account that has not been verified", async () => {
    const user = await createActiveUser("someone");
    await userModel.update(user.userId, { isActive: false });

    await request(getApp())
      .post("/api/v1/users/login")
      .send({ email: user.email, password: TEST_PASSWORD, turnstileToken: "test-token" })
      .expect(406);
  });
});

describe("access token status codes the client relies on", () => {
  it("answers 410 for an expired access token so the client refreshes instead of logging out", async () => {
    const user = await createActiveUser("someone");
    const expired = JWT.sign(
      { _id: user.userId, email: user.email, exp: Math.floor(Date.now() / 1000) - 60 },
      environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE
    );

    await request(getApp()).get("/api/v1/boards").set("Cookie", `accessToken=${expired}`).expect(410);
  });

  it("answers 401 for a token signed with the wrong secret", async () => {
    const forged = JWT.sign({ _id: "65f1a2b3c4d5e6f7a8b9c0d1", email: "x@trellify.test" }, "not-the-secret");

    await request(getApp()).get("/api/v1/boards").set("Cookie", `accessToken=${forged}`).expect(401);
  });

  it("issues a new access token from a valid refresh token", async () => {
    const user = await createActiveUser("someone");
    const refreshToken = JWT.sign(
      { _id: user.userId, email: user.email },
      environmentConfig.REFRESH_TOKEN_SECRET_SIGNATURE,
      { expiresIn: 60 }
    );

    const response = await request(getApp())
      .get("/api/v1/users/refresh_token")
      .set("Cookie", `refreshToken=${refreshToken}`)
      .expect(200);

    expect(cookiesOf(response.headers["set-cookie"]).some((cookie) => cookie.startsWith("accessToken="))).toBe(true);
  });
});
