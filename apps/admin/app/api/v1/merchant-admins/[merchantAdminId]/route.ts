import { NextResponse } from "next/server";

import { merchantAdminLinkBodySchema } from "@/libs/merchantAdmin/contracts";
import { apiError } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { linkMerchantAdmin } from "@/server/merchantAdmin/merchantAdmins";

import type { NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ merchantAdminId: string }> }) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantAdminId = parseId((await params).merchantAdminId);
    if (!merchantAdminId) return apiError("MERCHANT_ADMIN_NOT_FOUND", "업체 관리자를 찾을 수 없습니다.", 404);
    const body = merchantAdminLinkBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "연결할 업체를 확인해 주세요.", 400);
    const result = await linkMerchantAdmin(merchantAdminId, body.data.merchantId);
    if (result === "MERCHANT_NOT_FOUND") return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    if (result === "NOT_FOUND") return apiError("MERCHANT_ADMIN_NOT_FOUND", "업체 관리자를 찾을 수 없습니다.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to link merchant admin", error);
    return apiError("MERCHANT_ADMIN_SAVE_FAILED", "업체 연결을 저장하지 못했습니다.", 500);
  }
}
