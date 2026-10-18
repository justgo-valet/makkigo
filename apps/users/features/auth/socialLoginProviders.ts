const SOCIAL_LOGIN_PROVIDERS = ["kakao", "google", "apple"] as const;

type SocialLoginProvider = (typeof SOCIAL_LOGIN_PROVIDERS)[number];

type DevicePlatform = "ios" | "android" | "other";

const PROVIDERS_BY_PLATFORM: Record<DevicePlatform, readonly SocialLoginProvider[]> = {
  ios: ["kakao", "google", "apple"],
  android: ["kakao", "google"],
  other: SOCIAL_LOGIN_PROVIDERS,
};

const LOGIN_ERROR_MESSAGES = {
  cancelled: "로그인을 취소했어요.",
  failed: "로그인하지 못했어요. 다시 시도해주세요.",
} as const;

type LoginError = keyof typeof LOGIN_ERROR_MESSAGES;

const getDevicePlatform = (userAgent: string): DevicePlatform => {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";

  return "other";
};

const parseLoginError = (value: string | string[] | undefined): LoginError | null =>
  value === "cancelled" || value === "failed" ? value : null;

export {
  getDevicePlatform,
  LOGIN_ERROR_MESSAGES,
  parseLoginError,
  PROVIDERS_BY_PLATFORM,
  SOCIAL_LOGIN_PROVIDERS,
};
export type { DevicePlatform, LoginError, SocialLoginProvider };
