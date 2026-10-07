import "server-only";
import type { NextRequest, NextResponse } from "next/server";

const OAUTH_CSRF_COOKIE = "makkigo_oauth_csrf";
const OAUTH_CSRF_COOKIE_PATH = "/api/v1/auth/oauth";
const OAUTH_CSRF_MAX_AGE_SECONDS = 10 * 60;

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: OAUTH_CSRF_COOKIE_PATH,
} as const;

const setOAuthCsrfCookie = (response: NextResponse, csrf: string) => {
  response.cookies.set(OAUTH_CSRF_COOKIE, csrf, {
    ...cookieOptions,
    maxAge: OAUTH_CSRF_MAX_AGE_SECONDS,
  });
};

const getOAuthCsrfCookie = (request: NextRequest) =>
  request.cookies.get(OAUTH_CSRF_COOKIE)?.value ?? null;

const clearOAuthCsrfCookie = (response: NextResponse) => {
  response.cookies.set(OAUTH_CSRF_COOKIE, "", { ...cookieOptions, maxAge: 0 });
};

export { clearOAuthCsrfCookie, getOAuthCsrfCookie, setOAuthCsrfCookie };
