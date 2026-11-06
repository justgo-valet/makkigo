import { ticketImageCompleteBodySchema } from "@/libs/ticket/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { requireMerchantAdminRequest } from "@/server/common/requireMerchantAdminRequest";
import { completeTicketImageUpload } from "@/server/ticket/ticketImageUploads";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const access = await requireMerchantAdminRequest(request);
    if ("error" in access) return access.error;
    const body = ticketImageCompleteBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "업로드 정보가 올바르지 않습니다.", 400);
    const result = await completeTicketImageUpload({ staffId: access.staffId, uploadId: body.data.uploadId });
    if (result.kind === "NOT_FOUND") return apiError("UPLOAD_NOT_FOUND", "업로드 예약을 찾을 수 없습니다.", 404);
    if (result.kind === "EXPIRED") return apiError("UPLOAD_EXPIRED", "이미지 업로드 시간이 지났습니다. 다시 올려 주세요.", 410);
    if (result.kind === "CONFLICT") return apiError("UPLOAD_CONFLICT", "이미지를 확정하지 못했습니다.", 409);
    return privateJson({ assetPath: result.assetPath });
  } catch (error) {
    console.error("Failed to complete ticket image", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return apiError("UPLOAD_FAILED", "이미지를 확인하지 못했습니다.", 503);
  }
}
