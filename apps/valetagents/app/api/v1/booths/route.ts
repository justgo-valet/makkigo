import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { getActiveStaffRole } from "@/server/auth/getActiveStaffRole";
import { searchBooths } from "@/server/booth/searchBooths";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { boothSearchQuerySchema } from "@/libs/booth/contracts/booths";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const role = await getActiveStaffRole(staffId);
    if (role === undefined) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (role !== "VALET_AGENT") {
      return apiError("VALET_AGENT_REQUIRED", "발렛 요원만 부스를 검색할 수 있습니다.", 403);
    }

    const query = boothSearchQuerySchema.safeParse(request.nextUrl.searchParams.get("q"));
    if (!query.success) {
      return apiError("INVALID_QUERY", "검색어를 1자 이상 50자 이하로 입력해 주세요.", 400);
    }

    return privateJson(await searchBooths(staffId, query.data));
  } catch (error) {
    console.error("Failed to search valet booths", error);
    return apiError("INTERNAL_ERROR", "부스를 검색하지 못했습니다.", 500);
  }
}
