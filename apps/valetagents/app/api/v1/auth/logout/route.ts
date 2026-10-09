import { revokeStaffRefreshToken } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/server/auth/authCookies";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  try {
    if (refreshToken) await revokeStaffRefreshToken(refreshToken);
  } catch (error) {
    console.error("Failed to logout staff", error);
    const response = NextResponse.json({ message: "로그아웃을 처리하지 못했습니다." }, { status: 500 });
    clearAuthCookies(response);
    return response;
  }
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
