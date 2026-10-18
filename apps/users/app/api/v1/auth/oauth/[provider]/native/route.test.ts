import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeUserNativeLogin: vi.fn(),
  issueUserTokens: vi.fn(),
  getPathAfterLogin: vi.fn(),
}));

vi.mock("@makkigo/auth", () => {
  class SocialAuthError extends Error {}
  class AuthConfigError extends Error {}

  return {
    SocialAuthError,
    AuthConfigError,
    completeUserNativeLogin: mocks.completeUserNativeLogin,
    issueUserTokens: mocks.issueUserTokens,
    parseSocialProvider: (value: string) =>
      ({ kakao: "KAKAO", google: "GOOGLE", apple: "APPLE" })[value] ?? null,
  };
});
vi.mock("@/server/auth/getPathAfterLogin", () => ({ getPathAfterLogin: mocks.getPathAfterLogin }));

import { SocialAuthError } from "@makkigo/auth";
import { NextRequest } from "next/server";

import { POST } from "./route";

const expiresAt = new Date(Date.now() + 60_000);

const callPost = (provider: string, body: unknown, contentType = "application/json") =>
  POST(
    new NextRequest(`http://users:3001/api/v1/auth/oauth/${provider}/native`, {
      method: "POST",
      headers: { "content-type": contentType },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ provider }) },
  );

describe("POST /api/v1/auth/oauth/{provider}/native", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.completeUserNativeLogin.mockResolvedValue({ userId: 7, isNewUser: false });
    mocks.issueUserTokens.mockResolvedValue({
      accessToken: { token: "access", expiresAt },
      refreshToken: { token: "refresh", expiresAt },
    });
    mocks.getPathAfterLogin.mockResolvedValue("/onboarding");
  });

  it("logs in with the SDK credential and sets auth cookies", async () => {
    const response = await callPost("kakao", { accessToken: "kakao-token" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/onboarding" });
    expect(mocks.completeUserNativeLogin).toHaveBeenCalledWith({
      provider: "KAKAO",
      credential: { accessToken: "kakao-token" },
    });
    expect(response.headers.get("set-cookie")).toContain("makkigo_access_token=access");
  });

  it("refuses non-JSON requests so other sites cannot post a login form", async () => {
    const response = await callPost("kakao", { accessToken: "kakao-token" }, "text/plain");

    expect(response.status).toBe(415);
    expect(mocks.completeUserNativeLogin).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown provider", async () => {
    expect((await callPost("naver", { accessToken: "x" })).status).toBe(404);
  });

  it("returns 401 without cookies when the provider rejects the credential", async () => {
    mocks.completeUserNativeLogin.mockRejectedValue(new SocialAuthError());

    const response = await callPost("google", { idToken: "forged" });

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
