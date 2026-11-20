import { merchantBodySchema } from "@/libs/merchant/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { createMerchant, searchMerchantOptions } from "@/server/merchant/merchants";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const query = (request.nextUrl.searchParams.get("query") ?? "").trim().slice(0, 100);
    return privateJson({ merchants: await searchMerchantOptions(query) });
  } catch (error) {
    logError("Failed to search merchants", error);
    return apiError("MERCHANT_SEARCH_FAILED", "업체를 찾지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const body = merchantBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "업체 정보를 확인해 주세요.", 400);
    const result = await createMerchant(body.data);
    if (!result.ok) return apiError("DUPLICATE_PLACE", "이미 등록된 카카오 장소입니다.", 409);
    return privateJson({ id: result.id }, { status: 201 });
  } catch (error) {
    logError("Failed to create merchant", error);
    return apiError("MERCHANT_SAVE_FAILED", "업체를 저장하지 못했습니다.", 500);
  }
}
