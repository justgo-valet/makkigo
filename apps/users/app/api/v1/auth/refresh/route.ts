import { InvalidRefreshTokenError, refreshUserTokens } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from "@/server/auth/authCookies";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 만료되었습니다. 다시 로그인해주세요.",
  INTERNAL_SERVER_ERROR: "로그인 상태를 갱신하지 못했습니다.",
} as const;

const unauthorized = () => {
  const response = NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
  clearAuthCookies(response);
  return response;
};

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return unauthorized();
  }

  try {
    const tokens = await refreshUserTokens({
      refreshToken,
      userAgent: request.headers.get("user-agent"),
    });

    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, tokens);

    return response;
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      return unauthorized();
    }

    console.error("Failed to refresh tokens", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
