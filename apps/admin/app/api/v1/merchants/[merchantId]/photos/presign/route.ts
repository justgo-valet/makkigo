import { merchantPhotoPresignBodySchema } from "@/libs/merchant/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { presignMerchantPhoto } from "@/server/merchant/merchantPhotos";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantId = parseId((await params).merchantId);
    if (!merchantId) return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    const body = merchantPhotoPresignBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "JPEG, PNG, WebP 이미지를 5MB 이하로 올려 주세요.", 400);
    const result = await presignMerchantPhoto(merchantId, body.data.contentType);
    if (result.kind === "MERCHANT_NOT_FOUND") return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    if (result.kind === "TOO_MANY_PHOTOS") return apiError("TOO_MANY_PHOTOS", "사진은 5장까지 올릴 수 있습니다.", 409);
    return privateJson({ key: result.key, upload: result.upload }, { status: 201 });
  } catch (error) {
    logError("Failed to presign merchant photo", error);
    return apiError("UPLOAD_SIGNING_FAILED", "사진 업로드를 준비하지 못했습니다.", 503);
  }
}
