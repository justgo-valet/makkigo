import { NextResponse } from "next/server";

import { merchantPhotoCompleteBodySchema, merchantPhotoOrderBodySchema } from "@/libs/merchant/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { completeMerchantPhoto, reorderMerchantPhotos } from "@/server/merchant/merchantPhotos";

import type { NextRequest } from "next/server";

type Context = { params: Promise<{ merchantId: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantId = parseId((await params).merchantId);
    if (!merchantId) return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    const body = merchantPhotoCompleteBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "업로드 정보가 올바르지 않습니다.", 400);
    const result = await completeMerchantPhoto(merchantId, body.data.key);
    if (result.kind === "MERCHANT_NOT_FOUND") return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    if (result.kind === "TOO_MANY_PHOTOS") return apiError("TOO_MANY_PHOTOS", "사진은 5장까지 올릴 수 있습니다.", 409);
    if (result.kind === "INVALID_UPLOAD") {
      return apiError("INVALID_UPLOAD", "올린 사진을 확인하지 못했습니다. 다시 올려 주세요.", 422);
    }
    return privateJson({ id: result.id }, { status: 201 });
  } catch (error) {
    logError("Failed to complete merchant photo", error);
    return apiError("UPLOAD_FAILED", "사진을 저장하지 못했습니다.", 503);
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantId = parseId((await params).merchantId);
    if (!merchantId) return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    const body = merchantPhotoOrderBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "사진 순서가 올바르지 않습니다.", 400);
    if (!(await reorderMerchantPhotos(merchantId, body.data.photoIds))) {
      return apiError("PHOTOS_CHANGED", "사진 목록이 바뀌었습니다. 새로 고친 뒤 다시 시도해 주세요.", 409);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to reorder merchant photos", error);
    return apiError("PHOTO_ORDER_FAILED", "사진 순서를 저장하지 못했습니다.", 500);
  }
}
