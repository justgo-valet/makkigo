import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { fetchIndustryCategories, hasPublicDataServiceKey, PublicDataError } from "@/server/merchantImport/publicDataStores";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    if (!hasPublicDataServiceKey()) {
      return apiError("PUBLIC_DATA_KEY_MISSING", "공공데이터 서비스키가 아직 설정되지 않아 업종 목록을 불러올 수 없습니다.", 503);
    }
    const parent = request.nextUrl.searchParams.get("parent");
    if (parent !== null && !/^[A-Z0-9]{2}$/.test(parent)) return apiError("INVALID_QUERY", "업종 대분류를 확인해 주세요.", 400);
    return privateJson({ industries: await fetchIndustryCategories(parent) });
  } catch (error) {
    logError("Failed to load industry categories", error);
    const message = error instanceof PublicDataError ? error.message : "업종 목록을 불러오지 못했습니다.";
    return apiError("INDUSTRY_LOAD_FAILED", message, 502);
  }
}
