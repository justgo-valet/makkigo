import "server-only";
import type { SocialProvider } from "database";

const APP_CALLBACK_URL = "com.makkigo.user://auth";

type LoginError = "cancelled" | "failed";

const getPublicUrl = () => {
  const value = process.env.PUBLIC_URL?.trim();

  if (!value) {
    throw new Error("환경변수 PUBLIC_URL 이 설정되지 않았습니다.");
  }

  return value;
};

const toPublicUrl = (path: string) => new URL(path, getPublicUrl());

const getOAuthRedirectUri = (provider: SocialProvider) =>
  toPublicUrl(`/api/v1/auth/oauth/${provider.toLowerCase()}/callback`).toString();

const getLoginErrorUrl = (error: LoginError) => toPublicUrl(`/login?error=${error}`);

const getAppCallbackUrl = (query: { code: string } | { error: LoginError }) =>
  `${APP_CALLBACK_URL}?${new URLSearchParams(query).toString()}`;

export { getAppCallbackUrl, getLoginErrorUrl, getOAuthRedirectUri, toPublicUrl };
export type { LoginError };
