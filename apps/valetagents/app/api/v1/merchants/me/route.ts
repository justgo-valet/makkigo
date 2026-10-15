import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { listOwnMerchants } from "@/server/merchant/listOwnMerchants";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const onboarding = await getStaffOnboardingState(staffId);
    if (!onboarding) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (onboarding.role !== "MERCHANT_ADMIN") {
      return apiError("MERCHANT_ADMIN_REQUIRED", "업체 관리자만 조회할 수 있습니다.", 403);
    }

    const imageBaseUrl = process.env.IMAGE_BASE_URL;
    if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
    return privateJson(await listOwnMerchants(staffId, imageBaseUrl));
  } catch (error) {
    console.error("Failed to list own merchants", error);
    return apiError("INTERNAL_ERROR", "업체 목록을 불러오지 못했습니다.", 500);
  }
}
