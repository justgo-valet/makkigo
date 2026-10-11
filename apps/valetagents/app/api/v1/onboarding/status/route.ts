import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const status = await getStaffOnboardingState(staffId);
    if (!status) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    return privateJson(status);
  } catch (error) {
    console.error("Failed to get valet onboarding status", error);
    return apiError("INTERNAL_ERROR", "온보딩 상태를 불러오지 못했습니다.", 500);
  }
}
