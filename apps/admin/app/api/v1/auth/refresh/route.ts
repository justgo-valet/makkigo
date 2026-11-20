import { InvalidRefreshTokenError, refreshAdminTokens } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from "@/server/auth/authCookies";
import { toPublicUrl } from "@/server/auth/publicUrl";
import { isSameOrigin } from "@/server/common/isSameOrigin";
import { logError } from "@/server/common/logError";

import type { NextRequest } from "next/server";

const refresh = async (request: NextRequest) => {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;
  try {
    return await refreshAdminTokens({ refreshToken, userAgent: request.headers.get("user-agent") });
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) return null;
    throw error;
  }
};

const toSafeUrl = (value: string | null) => {
  const home = toPublicUrl("/");
  const url = value?.startsWith("/") ? toPublicUrl(value) : home;
  return url.origin === home.origin ? url : home;
};

export async function GET(request: NextRequest) {
  const tokens = await refresh(request).catch((error: unknown) => {
    logError("Failed to refresh admin tokens", error);
    return null;
  });
  const response = NextResponse.redirect(
    tokens ? toSafeUrl(request.nextUrl.searchParams.get("next")) : toPublicUrl("/login"),
    303,
  );
  if (tokens) setAuthCookies(response, tokens);
  else clearAuthCookies(response);
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다.", code: "INVALID_ORIGIN" }, { status: 403 });
  }
  try {
    const tokens = await refresh(request);
    if (!tokens) {
      const response = NextResponse.json({ message: "로그인이 만료되었습니다. 다시 로그인해 주세요." }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }
    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    logError("Failed to refresh admin tokens", error);
    return NextResponse.json({ message: "로그인 상태를 갱신하지 못했습니다." }, { status: 500 });
  }
}
