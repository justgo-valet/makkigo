import "server-only";

import type { NextRequest, NextResponse } from "next/server";

const PATH = "/api/v1";
const MAX_AGE = 10 * 60;
const CSRF_COOKIE = "makkigo_staff_oauth_csrf";
const VERIFIER_COOKIE = "makkigo_staff_app_login_verifier";
const isProduction = process.env.NODE_ENV === "production";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
const oauthOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: PATH,
  ...(cookieDomain ? { domain: cookieDomain } : {}),
} as const;
const verifierOptions = { ...oauthOptions, sameSite: "lax" } as const;

export const setOAuthCsrfCookie = (response: NextResponse, value: string) =>
  response.cookies.set(CSRF_COOKIE, value, { ...oauthOptions, maxAge: MAX_AGE });
export const getOAuthCsrfCookie = (request: NextRequest) =>
  request.cookies.get(CSRF_COOKIE)?.value ?? null;
export const clearOAuthCsrfCookie = (response: NextResponse) =>
  response.cookies.set(CSRF_COOKIE, "", { ...oauthOptions, maxAge: 0 });
export const setAppLoginVerifierCookie = (response: NextResponse, value: string) =>
  response.cookies.set(VERIFIER_COOKIE, value, { ...verifierOptions, maxAge: MAX_AGE });
export const getAppLoginVerifierCookie = (request: NextRequest) =>
  request.cookies.get(VERIFIER_COOKIE)?.value ?? null;
export const clearAppLoginVerifierCookie = (response: NextResponse) =>
  response.cookies.set(VERIFIER_COOKIE, "", { ...verifierOptions, maxAge: 0 });
