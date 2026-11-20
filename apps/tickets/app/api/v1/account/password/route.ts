import {
  changeMerchantAdminPassword,
  getClientIp,
  InvalidPasswordError,
  PasswordLoginError,
  takeLoginAttempt,
} from "@makkigo/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_TOKEN_COOKIE, setAuthCookies } from "@/server/auth/authCookies";
import { getMerchantAdminFromToken } from "@/server/auth/merchantAdminSession";
import { apiError } from "@/server/common/apiResponse";
import { isSameOrigin } from "@/server/common/isSameOrigin";

import type { NextRequest } from "next/server";

const passwordBodySchema = z
  .object({ currentPassword: z.string().max(200), newPassword: z.string().max(200) })
  .strict();

const FAILURES = {
  INVALID_CREDENTIALS: { status: 400, message: "지금 비밀번호가 맞지 않습니다." },
  LOCKED: { status: 429, message: "비밀번호를 여러 번 틀려 잠시 잠겼습니다. 15분 뒤에 다시 시도해 주세요." },
  DISABLED: { status: 403, message: "사용이 중지된 계정입니다." },
} as const;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
  if (!takeLoginAttempt(`merchant-admin:${getClientIp(request.headers)}`)) {
    return apiError("TOO_MANY_ATTEMPTS", "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  }
  try {
    const merchantAdmin = await getMerchantAdminFromToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
    if (!merchantAdmin) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const body = passwordBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "비밀번호를 입력해 주세요.", 400);
    const tokens = await changeMerchantAdminPassword({
      merchantAdminId: merchantAdmin.id,
      ...body.data,
      userAgent: request.headers.get("user-agent"),
    });
    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof InvalidPasswordError) return apiError("INVALID_PASSWORD", error.message, 400);
    if (error instanceof PasswordLoginError) {
      const failure = FAILURES[error.reason];
      return apiError(error.reason, failure.message, failure.status);
    }
    console.error("Failed to change merchant admin password", error);
    return apiError("INTERNAL_ERROR", "비밀번호를 바꾸지 못했습니다.", 500);
  }
}
