import { z } from "zod";

import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { setAgentNotifications } from "@/server/booth/boothAgent";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_AGENT_REQUIRED: { status: 403, message: "부스에 등록된 요원만 이용할 수 있습니다." },
} as const;

const bodySchema = z.object({ enabled: z.boolean() }).strict();

const parseBoothId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다.", 400);

    const result = await setAgentNotifications(staffId, boothId, body.data.enabled);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to change agent notifications", error);
    return apiError("INTERNAL_ERROR", "알림 설정을 바꾸지 못했습니다.", 500);
  }
}
