import { apiError, privateJson } from "@/server/common/apiResponse";
import { requireMerchantAdminRequest } from "@/server/common/requireMerchantAdminRequest";
import { listMerchantValetSessions } from "@/server/valet/listMerchantValetSessions";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const access = await requireMerchantAdminRequest(request);
    if ("error" in access) return access.error;
    const imageBaseUrl = process.env.IMAGE_BASE_URL;
    if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
    return privateJson(await listMerchantValetSessions(access.merchantId, imageBaseUrl));
  } catch (error) {
    console.error("Failed to list merchant valet sessions", error);
    return apiError("INTERNAL_ERROR", "차량 목록을 불러오지 못했습니다.", 500);
  }
}
