import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";
import { recordStaffConsents } from "@/server/consent/staffConsents";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    await recordStaffConsents(staffId);

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to record staff consents", error);
    return apiError("INTERNAL_ERROR", "약관 동의를 저장하지 못했습니다.", 500);
  }
}
