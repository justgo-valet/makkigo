import "server-only";

import type { IssuedToken } from "@makkigo/auth";
import type { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "makkigo_staff_access_token";
const REFRESH_TOKEN_COOKIE = "makkigo_staff_refresh_token";
const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";
const OAUTH_COOKIE_PATH = "/api/v1";
const OAUTH_COOKIE_MAX_AGE = 10 * 60;
const CSRF_COOKIE = "makkigo_staff_oauth_csrf";
const VERIFIER_COOKIE = "makkigo_staff_app_login_verifier";
const isProduction = process.env.NODE_ENV === "production";
const baseOptions = { httpOnly: true, secure: isProduction, sameSite: "lax" } as const;

const csrfOptions = () => {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (isProduction && !domain) throw new Error("운영 환경변수 AUTH_COOKIE_DOMAIN 이 설정되지 않았습니다.");
  return {
    ...baseOptions,
    sameSite: isProduction ? "none" : "lax",
    path: OAUTH_COOKIE_PATH,
    ...(domain ? { domain } : {}),
  } as const;
};

const setAuthCookies = (
  response: NextResponse,
  tokens: { accessToken: IssuedToken; refreshToken: IssuedToken },
) => {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken.token, {
    ...baseOptions,
    path: "/",
    expires: tokens.accessToken.expiresAt,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken.token, {
    ...baseOptions,
    path: REFRESH_TOKEN_COOKIE_PATH,
    expires: tokens.refreshToken.expiresAt,
  });
};

const clearAuthCookies = (response: NextResponse) => {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...baseOptions, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...baseOptions, path: REFRESH_TOKEN_COOKIE_PATH, maxAge: 0 });
};

const setOAuthCookies = (response: NextResponse, values: { csrf: string; verifier: string }) => {
  response.cookies.set(CSRF_COOKIE, values.csrf, { ...csrfOptions(), maxAge: OAUTH_COOKIE_MAX_AGE });
  response.cookies.set(VERIFIER_COOKIE, values.verifier, {
    ...baseOptions,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
};

const getLoginVerifierCookie = (request: NextRequest) => request.cookies.get(VERIFIER_COOKIE)?.value ?? null;

const clearLoginVerifierCookie = (response: NextResponse) =>
  response.cookies.set(VERIFIER_COOKIE, "", { ...baseOptions, path: OAUTH_COOKIE_PATH, maxAge: 0 });

export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  clearLoginVerifierCookie,
  getLoginVerifierCookie,
  setAuthCookies,
  setOAuthCookies,
};
