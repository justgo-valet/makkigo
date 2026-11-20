import { getClientIp, takeLoginAttempt } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { merchantAccountRequestBodySchema } from "@/libs/merchantAccountRequest/contracts";
import { apiError } from "@/server/common/apiResponse";
import { isSameOrigin } from "@/server/common/isSameOrigin";
import { createMerchantAccountRequest } from "@/server/merchantAccountRequest/merchantAccountRequests";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
  if (!takeLoginAttempt(`merchant-account-request:${getClientIp(request.headers)}`)) {
    return apiError("TOO_MANY_ATTEMPTS", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  }
  const body = merchantAccountRequestBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError("INVALID_INPUT", "입력한 내용을 확인해 주세요.", 400);
  try {
    const result = await createMerchantAccountRequest(body.data);
    if (result === "MERCHANT_NOT_FOUND") return apiError(result, "업체를 찾을 수 없습니다.", 404);
    if (result === "ALREADY_REQUESTED") return apiError(result, "이미 접수된 요청이 있어요. 운영팀 연락을 기다려 주세요.", 409);
    return new NextResponse(null, { status: 201 });
  } catch (error) {
    console.error("Failed to create merchant account request", error);
    return apiError("INTERNAL_ERROR", "요청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
