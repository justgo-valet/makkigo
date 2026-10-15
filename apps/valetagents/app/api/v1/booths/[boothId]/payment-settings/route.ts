import { paymentSettingsSchema } from "@/libs/booth/contracts/payment-settings";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { savePaymentSettings } from "@/server/booth/paymentSettings";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_MANAGER_REQUIRED: { status: 403, message: "부스 관리자만 요금 · 계좌를 바꿀 수 있습니다." },
} as const;

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

    const body = paymentSettingsSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_REQUEST", "요금과 계좌 정보를 확인해 주세요.", 400);

    const result = await savePaymentSettings(staffId, boothId, body.data);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to save payment settings", error);
    return apiError("INTERNAL_ERROR", "요금 · 계좌를 저장하지 못했습니다.", 500);
  }
}
