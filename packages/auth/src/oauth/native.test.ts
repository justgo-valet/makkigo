import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock("./id-token", () => ({ verifyIdToken: mocks.verifyIdToken }));

import { SocialAuthError } from "../errors";
import { identifyNativeLogin } from "./native";

const kakaoFetch = (appId: number) =>
  vi.fn(async (url: string) =>
    url.endsWith("/v1/user/access_token_info")
      ? Response.json({ id: 1, app_id: appId })
      : Response.json({
          id: 42,
          kakao_account: { email: "a@kakao.com", is_email_verified: true },
        }),
  );

describe("identifyNativeLogin", () => {
  beforeEach(() => {
    vi.stubEnv("KAKAO_APP_ID", "1234");
    vi.stubEnv("GOOGLE_CLIENT_ID", "web-client.apps.googleusercontent.com");
    vi.stubEnv("APPLE_BUNDLE_ID", "com.makkigo.user");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("accepts a Kakao token issued to our app", async () => {
    vi.stubGlobal("fetch", kakaoFetch(1234));

    await expect(identifyNativeLogin("KAKAO", { accessToken: "kakao-token" })).resolves.toEqual({
      provider: "KAKAO",
      providerUserId: "42",
      email: "a@kakao.com",
    });
  });

  it("rejects a Kakao token issued to another app", async () => {
    const fetchMock = kakaoFetch(9999);
    vi.stubGlobal("fetch", fetchMock);

    await expect(identifyNativeLogin("KAKAO", { accessToken: "kakao-token" })).rejects.toThrow(
      SocialAuthError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("checks the Google ID token against the web client ID", async () => {
    mocks.verifyIdToken.mockResolvedValue({ sub: "g-1", email: "a@gmail.com", email_verified: true });

    await expect(identifyNativeLogin("GOOGLE", { idToken: "google-id-token" })).resolves.toEqual({
      provider: "GOOGLE",
      providerUserId: "g-1",
      email: "a@gmail.com",
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("google-id-token", expect.anything(), {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: "web-client.apps.googleusercontent.com",
      nonce: null,
    });
  });

  it("checks the Apple ID token against the app bundle ID", async () => {
    mocks.verifyIdToken.mockResolvedValue({ sub: "a-1", email: "a@privaterelay.appleid.com" });

    await expect(
      identifyNativeLogin("APPLE", { idToken: "apple-id-token", authorizationCode: "code" }),
    ).resolves.toEqual({
      provider: "APPLE",
      providerUserId: "a-1",
      email: "a@privaterelay.appleid.com",
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith(
      "apple-id-token",
      expect.anything(),
      expect.objectContaining({ audience: "com.makkigo.user", nonce: null }),
    );
  });

  it("rejects a credential without the provider's token", async () => {
    await expect(identifyNativeLogin("GOOGLE", { accessToken: "x" })).rejects.toThrow(
      SocialAuthError,
    );
    await expect(identifyNativeLogin("KAKAO", { idToken: "x" })).rejects.toThrow(SocialAuthError);
  });
});
