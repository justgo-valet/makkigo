import { ticketImageCompleteBodySchema } from "@/libs/ticket/contracts/ticketEditor";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";
import { prisma } from "database";

import type { NextRequest } from "next/server";

const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const access = await getMerchantRegistrationAccess(staffId);
    if (!access.ok) return apiError(access.reason, "업체 관리자만 티켓 이미지를 올릴 수 있습니다.", access.reason === "AUTH_REQUIRED" ? 401 : 403);
    if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
    const body = ticketImageCompleteBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "업로드 정보가 올바르지 않습니다.", 400);
    const upload = await prisma.ticketImageUpload.findUnique({ where: { id: body.data.uploadId } });
    if (!upload) return apiError("UPLOAD_NOT_FOUND", "업로드 예약을 찾을 수 없습니다.", 404);
    if (upload.staffId !== staffId) return apiError("UPLOAD_FORBIDDEN", "다른 사용자의 업로드입니다.", 403);
    if (upload.state === "COMPLETE") return privateJson({ assetPath: upload.finalKey });
    const merchant = await prisma.merchant.findFirst({
      where: { id: upload.merchantId, adminId: staffId, deletedAt: null },
      select: { id: true },
    });
    if (!merchant) return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
    if (upload.expiresAt <= new Date()) return apiError("UPLOAD_EXPIRED", "이미지 업로드 시간이 지났습니다.", 410);

    const storage = createS3MerchantUploadStorage();
    const source = await storage.inspectObject(upload.stagingKey, {
      size: upload.size,
      contentType: upload.contentType as "image/jpeg" | "image/png" | "image/webp",
    });
    if (upload.sourceETag && upload.sourceETag !== source.etag) {
      return apiError("UPLOAD_CHANGED", "업로드한 이미지가 변경되었습니다.", 409);
    }
    if (!upload.sourceETag) {
      const claim = await prisma.ticketImageUpload.updateMany({
        where: { id: upload.id, state: "RESERVED", sourceETag: null },
        data: { sourceETag: source.etag },
      });
      if (claim.count === 0) {
        const latest = await prisma.ticketImageUpload.findUnique({ where: { id: upload.id } });
        if (latest?.state === "COMPLETE") return privateJson({ assetPath: latest.finalKey });
        if (latest?.sourceETag !== source.etag) return apiError("UPLOAD_CHANGED", "업로드한 이미지가 변경되었습니다.", 409);
      }
    }
    const copied = await storage.copyUpload({
      sourceKey: upload.stagingKey,
      destinationKey: upload.finalKey,
      sourceETag: source.etag,
      contentType: upload.contentType as "image/jpeg" | "image/png" | "image/webp",
      size: upload.size,
      sessionId: `ticket-${upload.merchantId}`,
      uploadId: upload.id,
    });
    const claimed = await prisma.ticketImageUpload.updateMany({
      where: { id: upload.id, state: "RESERVED", sourceETag: source.etag },
      data: { state: "COMPLETE", finalETag: copied.etag },
    });
    if (claimed.count === 0) {
      const latest = await prisma.ticketImageUpload.findUnique({ where: { id: upload.id } });
      if (latest?.state !== "COMPLETE" || latest.finalETag !== copied.etag) {
        return apiError("UPLOAD_CONFLICT", "이미지를 확정하지 못했습니다.", 409);
      }
    }
    try {
      await storage.deleteObject({ key: upload.stagingKey });
    } catch (error) {
      console.error("Failed to delete ticket staging image", { errorName: error instanceof Error ? error.name : "UnknownError" });
    }
    return privateJson({ assetPath: upload.finalKey });
  } catch (error) {
    console.error("Failed to complete ticket image", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return apiError("UPLOAD_FAILED", "이미지를 확인하지 못했습니다.", 503);
  }
}
