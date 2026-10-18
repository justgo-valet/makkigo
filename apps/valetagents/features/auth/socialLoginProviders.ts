const SOCIAL_LOGIN_PROVIDERS = ["kakao", "google", "apple"] as const;
type SocialLoginProvider = (typeof SOCIAL_LOGIN_PROVIDERS)[number];
type LoginError = "cancelled" | "failed";

const getProviders = (userAgent: string): readonly SocialLoginProvider[] => {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return ["kakao", "google", "apple"];
  if (/Android/i.test(userAgent)) return ["kakao", "google"];
  return SOCIAL_LOGIN_PROVIDERS;
};

const parseLoginError = (value: string | string[] | undefined): LoginError | null =>
  value === "cancelled" || value === "failed" ? value : null;

export { getProviders, parseLoginError };
export type { LoginError, SocialLoginProvider };
