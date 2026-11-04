import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  identify: vi.fn(),
  exchangeAppleProviderToken: vi.fn(),
  findOrCreateStaffBySocialIdentity: vi.fn(),
}));

vi.mock("./oauth", () => ({
  oauthProviders: {
    KAKAO: { identify: mocks.identify },
    GOOGLE: { identify: mocks.identify },
    APPLE: { identify: mocks.identify },
  },
}));
vi.mock("./oauth/apple-token", () => ({
  exchangeAppleProviderToken: mocks.exchangeAppleProviderToken,
}));
vi.mock("./staff-social-account", () => ({
  findOrCreateStaffBySocialIdentity: mocks.findOrCreateStaffBySocialIdentity,
}));

import { completeStaffOAuth } from "./staff-oauth";

const CALLBACK = "https://app.makkigo.com/api/v1/staff/auth/oauth/apple/callback";

describe("completeStaffOAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APPLE_SERVICES_ID", "com.makkigo.user.web");
    mocks.findOrCreateStaffBySocialIdentity.mockResolvedValue({ staffId: 7, isNewStaff: false });
  });

  it("애플 로그인이면 인가 코드를 탈퇴 철회용 리프레시 토큰으로 바꿔 저장한다", async () => {
    const identity = { provider: "APPLE", providerUserId: "apple-1", email: null };
    const token = { refreshToken: "apple-refresh", clientId: "com.makkigo.user.web" };
    mocks.identify.mockResolvedValue(identity);
    mocks.exchangeAppleProviderToken.mockResolvedValue(token);

    await completeStaffOAuth({
      provider: "APPLE",
      params: { code: "apple-code", idToken: "id-token" },
      state: "state",
      nonce: "nonce",
      redirectUri: CALLBACK,
    });

    expect(mocks.exchangeAppleProviderToken).toHaveBeenCalledWith("apple-code", {
      clientId: "com.makkigo.user.web",
      redirectUri: CALLBACK,
    });
    expect(mocks.findOrCreateStaffBySocialIdentity).toHaveBeenCalledWith(identity, token);
  });

  it("애플이 아니면 토큰을 교환하지 않는다", async () => {
    const identity = { provider: "KAKAO", providerUserId: "kakao-1", email: null };
    mocks.identify.mockResolvedValue(identity);

    await completeStaffOAuth({
      provider: "KAKAO",
      params: { code: "kakao-code", idToken: null },
      state: "state",
      nonce: "nonce",
      redirectUri: CALLBACK,
    });

    expect(mocks.exchangeAppleProviderToken).not.toHaveBeenCalled();
    expect(mocks.findOrCreateStaffBySocialIdentity).toHaveBeenCalledWith(identity, null);
  });
});
