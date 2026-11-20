import { getClientIp, loginAdmin, PasswordLoginError, takeLoginAttempt } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { loginBodySchema } from "@/libs/auth/contracts";
import { setAuthCookies } from "@/server/auth/authCookies";
import { apiError } from "@/server/common/apiResponse";
import { isSameOrigin } from "@/server/common/isSameOrigin";
import { logError } from "@/server/common/logError";

import type { NextRequest } from "next/server";

const LOGIN_FAILURE_STATUS = { INVALID_CREDENTIALS: 401, LOCKED: 429, DISABLED: 403 } as const;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
  if (!takeLoginAttempt(`admin:${getClientIp(request.headers)}`)) {
    return apiError("TOO_MANY_ATTEMPTS", "로그인 시도가 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.", 429);
  }
  const body = loginBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError("INVALID_INPUT", "아이디와 비밀번호를 입력해 주세요.", 400);
  try {
    const tokens = await loginAdmin({ ...body.data, userAgent: request.headers.get("user-agent") });
    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof PasswordLoginError) {
      return apiError(error.reason, error.message, LOGIN_FAILURE_STATUS[error.reason]);
    }
    logError("Failed to login admin", error);
    return apiError("LOGIN_FAILED", "로그인하지 못했습니다.", 500);
  }
}
