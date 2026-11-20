import { revokeAdminRefreshToken } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { apiError } from "@/server/common/apiResponse";
import { isSameOrigin } from "@/server/common/isSameOrigin";
import { logError } from "@/server/common/logError";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  try {
    if (refreshToken) await revokeAdminRefreshToken(refreshToken);
  } catch (error) {
    logError("Failed to logout admin", error);
    return apiError("LOGOUT_FAILED", "로그아웃하지 못했습니다.", 500);
  }
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
