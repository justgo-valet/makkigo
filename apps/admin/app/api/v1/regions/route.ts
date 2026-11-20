import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { findSignguRegion } from "@/server/kakao/findSignguRegion";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const query = (request.nextUrl.searchParams.get("query") ?? "").trim();
    if (!query || query.length > 50) return apiError("INVALID_QUERY", "지역을 50자 이하로 입력해 주세요.", 400);
    const region = await findSignguRegion(query);
    if (!region) return apiError("REGION_NOT_FOUND", "시군구를 찾지 못했습니다. \"서울 강남구\" 처럼 입력해 주세요.", 404);
    return privateJson({ region });
  } catch (error) {
    logError("Failed to find region", error);
    return apiError("REGION_SEARCH_FAILED", "지역을 찾지 못했습니다.", 502);
  }
}
