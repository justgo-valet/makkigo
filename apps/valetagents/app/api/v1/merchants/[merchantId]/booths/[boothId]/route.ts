import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";
import { requestMerchantBooth } from "@/server/merchant/requestMerchantBooth";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  MERCHANT_ADMIN_REQUIRED: { status: 403, message: "업체 관리자만 계약을 요청할 수 있습니다." },
  MERCHANT_ALREADY_APPROVED: { status: 409, message: "이미 승인된 업체입니다." },
  MERCHANT_NOT_FOUND: { status: 404, message: "업체를 찾을 수 없습니다." },
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  ALREADY_REQUESTED: { status: 409, message: "이미 계약을 요청한 부스입니다." },
} as const;

const parseId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string; boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const ids = await params;
    const merchantId = parseId(ids.merchantId);
    const boothId = parseId(ids.boothId);
    if (!merchantId || !boothId) {
      return apiError("INVALID_REQUEST", "올바른 업체 · 부스 ID가 필요합니다.", 400);
    }

    const result = await requestMerchantBooth(staffId, merchantId, boothId);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to request merchant booth contract", error);
    return apiError("INTERNAL_ERROR", "계약을 요청하지 못했습니다.", 500);
  }
}
