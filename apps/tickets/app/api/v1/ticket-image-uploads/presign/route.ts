import { ticketImageUploadBodySchema } from "@/libs/ticket/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { requireMerchantAdminRequest } from "@/server/common/requireMerchantAdminRequest";
import { reserveTicketImageUpload } from "@/server/ticket/ticketImageUploads";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const access = await requireMerchantAdminRequest(request);
    if ("error" in access) return access.error;
    const body = ticketImageUploadBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "JPEG, PNG, WebP 이미지를 5MB 이하로 올려 주세요.", 400);
    const result = await reserveTicketImageUpload({ staffId: access.staffId, ...body.data });
    if (result.kind === "MERCHANT_NOT_FOUND") return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    return privateJson({ uploadId: result.uploadId, upload: result.upload }, { status: 201 });
  } catch (error) {
    console.error("Failed to presign ticket image", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return apiError("UPLOAD_SIGNING_FAILED", "이미지 업로드를 준비하지 못했습니다.", 503);
  }
}
