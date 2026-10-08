import "server-only";

import type { NextRequest, NextResponse } from "next/server";

const PATH = "/api/v1";
const MAX_AGE = 10 * 60;
const CSRF_COOKIE = "makkigo_staff_oauth_csrf";
const VERIFIER_COOKIE = "makkigo_staff_app_login_verifier";
const isProduction = process.env.NODE_ENV === "production";
const getSharedCookieDomain = () => {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (isProduction && !domain) {
    throw new Error("운영 환경변수 AUTH_COOKIE_DOMAIN 이 설정되지 않았습니다.");
  }
  return domain;
};
const baseOptions = {
  httpOnly: true,
  secure: isProduction,
  path: PATH,
} as const;
const oauthOptions = () => {
  const domain = getSharedCookieDomain();
  return {
    ...baseOptions,
    sameSite: isProduction ? "none" : "lax",
    ...(domain ? { domain } : {}),
  } as const;
};
const verifierOptions = { ...baseOptions, sameSite: "lax" } as const;

export const setOAuthCsrfCookie = (response: NextResponse, value: string) =>
  response.cookies.set(CSRF_COOKIE, value, { ...oauthOptions(), maxAge: MAX_AGE });
export const getOAuthCsrfCookie = (request: NextRequest) =>
  request.cookies.get(CSRF_COOKIE)?.value ?? null;
export const clearOAuthCsrfCookie = (response: NextResponse) =>
  response.cookies.set(CSRF_COOKIE, "", { ...oauthOptions(), maxAge: 0 });
export const setAppLoginVerifierCookie = (response: NextResponse, value: string) =>
  response.cookies.set(VERIFIER_COOKIE, value, { ...verifierOptions, maxAge: MAX_AGE });
export const getAppLoginVerifierCookie = (request: NextRequest) =>
  request.cookies.get(VERIFIER_COOKIE)?.value ?? null;
export const clearAppLoginVerifierCookie = (response: NextResponse) =>
  response.cookies.set(VERIFIER_COOKIE, "", { ...verifierOptions, maxAge: 0 });
