import { after } from "next/server";

import { pickupResponseRequestSchema } from "@/libs/valet/contracts/pickup-response";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";
import { notifyPickupResponded } from "@/server/valet/notifyPickupResponded";
import { respondPickup } from "@/server/valet/respondPickup";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_AGENT_REQUIRED: { status: 403, message: "부스에 등록된 요원만 이용할 수 있습니다." },
  SESSION_NOT_FOUND: { status: 404, message: "차량을 찾을 수 없습니다." },
  NOT_RESPONDABLE: { status: 409, message: "이미 출차 응답을 했거나 출차 요청이 없는 차량입니다." },
} as const;

const parseId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string; sessionId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const { boothId: rawBoothId, sessionId: rawSessionId } = await params;
    const boothId = parseId(rawBoothId);
    const sessionId = parseId(rawSessionId);
    if (!boothId || !sessionId) {
      return apiError("INVALID_REQUEST", "올바른 부스 · 차량 ID가 필요합니다.", 400);
    }

    const body = pickupResponseRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return apiError("INVALID_REQUEST", "실제 요금과 예상 출차 시간을 확인해 주세요.", 400);
    }

    const result = await respondPickup(staffId, boothId, sessionId, body.data);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    const { notice } = result;
    if (notice) after(() => notifyPickupResponded(notice));

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to respond to pickup request", error);
    return apiError("INTERNAL_ERROR", "출차 응답을 보내지 못했습니다.", 500);
  }
}
