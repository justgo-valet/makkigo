import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { searchKakaoPlaces } from "@/server/kakao/searchKakaoPlaces";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const query = (request.nextUrl.searchParams.get("query") ?? "").trim();
    if (!query || query.length > 100) return apiError("INVALID_QUERY", "검색어를 100자 이하로 입력해 주세요.", 400);
    return privateJson({ places: await searchKakaoPlaces(query) });
  } catch (error) {
    logError("Failed to search Kakao places", error);
    return apiError("PLACE_SEARCH_FAILED", "카카오 장소를 검색하지 못했습니다.", 502);
  }
}
