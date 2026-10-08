import "server-only";

import type { SocialProvider } from "database";

type LoginError = "cancelled" | "failed";

const getPublicUrl = () => {
  const value = process.env.PUBLIC_URL?.trim();
  if (!value) throw new Error("환경변수 PUBLIC_URL 이 설정되지 않았습니다.");
  return value;
};

const toPublicUrl = (path: string) => new URL(path, getPublicUrl());
const getOAuthCallbackOrigin = () => {
  const value = process.env.OAUTH_CALLBACK_ORIGIN?.trim();
  if (!value) throw new Error("환경변수 OAUTH_CALLBACK_ORIGIN 이 설정되지 않았습니다.");
  return value;
};
const getOAuthRedirectUri = (provider: SocialProvider) =>
  new URL(
    `/api/v1/staff/auth/oauth/${provider.toLowerCase()}/callback`,
    getOAuthCallbackOrigin(),
  ).toString();
const getLoginErrorUrl = (error: LoginError) => toPublicUrl(`/login?error=${error}`);
const getAppCallbackUrl = (query: { code: string } | { error: LoginError }) => {
  const callback = process.env.APP_CALLBACK_URL?.trim() || "com.makkigo.valetagent://auth";
  return `${callback}?${new URLSearchParams(query).toString()}`;
};

export { getAppCallbackUrl, getLoginErrorUrl, getOAuthRedirectUri, toPublicUrl };
export type { LoginError };
