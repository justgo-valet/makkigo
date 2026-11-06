import { InvalidRefreshTokenError, refreshStaffTokens } from "@makkigo/auth";
import { NextResponse } from "next/server";

import {
  clearAuthCookies,
  clearSessionHintCookie,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from "@/server/auth/authCookies";
import { toPublicUrl } from "@/server/auth/oauthUrls";

import type { NextRequest } from "next/server";

const unauthorized = () => {
  const response = NextResponse.json({ message: "로그인이 만료되었습니다. 다시 로그인해주세요." }, { status: 401 });
  clearAuthCookies(response);
  return response;
};

const getResumeUrl = (next: string | null) => {
  const home = toPublicUrl("/");
  const url = next?.startsWith("/") ? toPublicUrl(next) : home;
  return url.origin === home.origin && !url.pathname.startsWith("/api/") ? url : home;
};

export async function GET(request: NextRequest) {
  const resumeUrl = getResumeUrl(request.nextUrl.searchParams.get("next"));
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    try {
      const tokens = await refreshStaffTokens({ refreshToken, userAgent: request.headers.get("user-agent") });
      const response = NextResponse.redirect(resumeUrl);
      setAuthCookies(response, tokens);
      return response;
    } catch (error) {
      if (!(error instanceof InvalidRefreshTokenError)) console.error("Failed to refresh staff tokens", error);
    }
  }
  const response = NextResponse.redirect(resumeUrl);
  clearSessionHintCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return unauthorized();
  try {
    const tokens = await refreshStaffTokens({ refreshToken, userAgent: request.headers.get("user-agent") });
    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) return unauthorized();
    console.error("Failed to refresh staff tokens", error);
    return NextResponse.json({ message: "로그인 상태를 갱신하지 못했습니다." }, { status: 500 });
  }
}
