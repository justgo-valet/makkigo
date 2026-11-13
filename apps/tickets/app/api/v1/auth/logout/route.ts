import { revokeStaffRefreshToken } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { isSameOrigin } from "@/server/common/isSameOrigin";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  try {
    if (refreshToken) await revokeStaffRefreshToken(refreshToken);
  } catch (error) {
    console.error("Failed to logout staff", error);
    return NextResponse.json({ message: "로그아웃하지 못했습니다." }, { status: 500 });
  }
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
