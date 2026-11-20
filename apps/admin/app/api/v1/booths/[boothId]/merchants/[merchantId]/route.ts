import { NextResponse } from "next/server";

import { apiError } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { removeBoothMerchant, requestBoothMerchant } from "@/server/booth/booths";

import type { NextRequest } from "next/server";

type Context = { params: Promise<{ boothId: string; merchantId: string }> };

const parseIds = async (params: Context["params"]) => {
  const { boothId, merchantId } = await params;
  const ids = { boothId: parseId(boothId), merchantId: parseId(merchantId) };
  return ids.boothId && ids.merchantId ? { boothId: ids.boothId, merchantId: ids.merchantId } : null;
};

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const ids = await parseIds(params);
    if (!ids) return apiError("BOOTH_NOT_FOUND", "부스를 찾을 수 없습니다.", 404);
    const result = await requestBoothMerchant(ids.boothId, ids.merchantId);
    if (result === "MERCHANT_NOT_FOUND") return apiError(result, "업체를 찾을 수 없습니다.", 404);
    if (result === "BOOTH_NOT_FOUND") return apiError(result, "부스를 찾을 수 없습니다.", 404);
    if (result === "ALREADY_REQUESTED") return apiError(result, "이미 연결 요청을 보낸 업체입니다.", 409);
    if (result === "ALREADY_CONNECTED") return apiError(result, "이미 연결된 업체입니다.", 409);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to request booth merchant", error);
    return apiError("BOOTH_MERCHANT_REQUEST_FAILED", "연결 요청을 보내지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const ids = await parseIds(params);
    const result = ids ? await removeBoothMerchant(ids.boothId, ids.merchantId) : "NOT_FOUND";
    if (result === "NOT_FOUND") return apiError("BOOTH_MERCHANT_NOT_FOUND", "연결을 찾을 수 없습니다.", 404);
    if (result === "ACTIVE_VALET_SESSION") {
      return apiError(result, "이 부스에 진행 중인 발렛 세션이 있어 연결을 해제할 수 없습니다.", 409);
    }
    if (result === "CHANGED") return apiError(result, "연결 상태가 바뀌었습니다. 새로 고친 뒤 다시 시도해 주세요.", 409);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to remove booth merchant", error);
    return apiError("BOOTH_MERCHANT_REMOVE_FAILED", "연결을 해제하지 못했습니다.", 500);
  }
}
