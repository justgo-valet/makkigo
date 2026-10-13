import { merchantBoothSearchQuerySchema } from "@/libs/merchant/contracts/merchant-booths";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { searchMerchantBooths } from "@/server/merchant/searchMerchantBooths";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";

import type { NextRequest } from "next/server";

const ACCESS_ERRORS = {
  AUTH_REQUIRED: { status: 401, message: "로그인이 필요합니다." },
  MERCHANT_ADMIN_REQUIRED: { status: 403, message: "업체 관리자만 부스를 검색할 수 있습니다." },
  MERCHANT_APPROVAL_PENDING: { status: 403, message: "업체 승인을 기다리고 있습니다." },
} as const;

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const access = await getMerchantRegistrationAccess(staffId);
    if (!access.ok) {
      const error = ACCESS_ERRORS[access.reason];
      return apiError(access.reason, error.message, error.status);
    }

    const query = merchantBoothSearchQuerySchema.safeParse(
      request.nextUrl.searchParams.get("query"),
    );
    if (!query.success) {
      return apiError("INVALID_QUERY", "검색어를 1자 이상 50자 이하로 입력해 주세요.", 400);
    }

    return privateJson(await searchMerchantBooths(query.data));
  } catch (error) {
    console.error("Failed to search merchant booths", error);
    return apiError("INTERNAL_ERROR", "부스를 검색하지 못했습니다.", 500);
  }
}
