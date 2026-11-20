import { NextResponse } from "next/server";

import { merchantBodySchema } from "@/libs/merchant/contracts";
import { apiError } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { deleteMerchant, updateMerchant } from "@/server/merchant/merchants";

import type { NextRequest } from "next/server";

type Context = { params: Promise<{ merchantId: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantId = parseId((await params).merchantId);
    if (!merchantId) return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    const body = merchantBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "업체 정보를 확인해 주세요.", 400);
    const result = await updateMerchant(merchantId, body.data);
    if (!result.ok) {
      return result.reason === "NOT_FOUND"
        ? apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404)
        : apiError("DUPLICATE_PLACE", "이미 등록된 카카오 장소입니다.", 409);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to update merchant", error);
    return apiError("MERCHANT_SAVE_FAILED", "업체를 저장하지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantId = parseId((await params).merchantId);
    const result = merchantId ? await deleteMerchant(merchantId) : "NOT_FOUND";
    if (result === "NOT_FOUND") return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    if (result === "ACTIVE_VALET_SESSION") {
      return apiError("ACTIVE_VALET_SESSION", "진행 중인 발렛 세션이 있어 삭제할 수 없습니다. 세션이 끝난 뒤 다시 시도해 주세요.", 409);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to delete merchant", error);
    return apiError("MERCHANT_DELETE_FAILED", "업체를 삭제하지 못했습니다.", 500);
  }
}
