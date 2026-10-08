import "server-only";

import type { IssuedToken } from "@makkigo/auth";
import type { NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "makkigo_staff_access_token";
const REFRESH_TOKEN_COOKIE = "makkigo_staff_refresh_token";
const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  ...(cookieDomain ? { domain: cookieDomain } : {}),
} as const;

const setAuthCookies = (
  response: NextResponse,
  tokens: { accessToken: IssuedToken; refreshToken: IssuedToken },
) => {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken.token, {
    ...baseCookieOptions,
    path: "/",
    expires: tokens.accessToken.expiresAt,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken.token, {
    ...baseCookieOptions,
    path: REFRESH_TOKEN_COOKIE_PATH,
    expires: tokens.refreshToken.expiresAt,
  });
};

const clearAuthCookies = (response: NextResponse) => {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...baseCookieOptions, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    ...baseCookieOptions,
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: 0,
  });
};

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies };
