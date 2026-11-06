import "server-only";

import type { SocialProvider } from "database";

const requireUrl = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`환경변수 ${name} 이 설정되지 않았습니다.`);
  return value;
};

const toPublicUrl = (path: string) => new URL(path, requireUrl("PUBLIC_URL"));

const getOAuthRedirectUri = (provider: SocialProvider) =>
  new URL(
    `/api/v1/staff/auth/oauth/${provider.toLowerCase()}/callback`,
    requireUrl("OAUTH_CALLBACK_ORIGIN"),
  ).toString();

export { getOAuthRedirectUri, toPublicUrl };
