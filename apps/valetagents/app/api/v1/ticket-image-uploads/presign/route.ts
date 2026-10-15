import { randomUUID } from "node:crypto";

import { ticketImageUploadBodySchema } from "@/libs/ticket/contracts/ticketEditor";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";
import { prisma } from "database";

import type { NextRequest } from "next/server";

const extensionFor = (contentType: string) =>
  contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";

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
    const body = ticketImageUploadBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "이미지 정보가 올바르지 않습니다.", 400);
    const merchant = await prisma.merchant.findFirst({
      where: { id: body.data.merchantId, adminId: staffId, deletedAt: null },
      select: { id: true },
    });
    if (!merchant) return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);

    const id = randomUUID();
    const extension = extensionFor(body.data.contentType);
    const stagingKey = `tickets/staging/${staffId}/${merchant.id}/${id}.${extension}`;
    const finalKey = `tickets/final/${staffId}/${merchant.id}/${id}.${extension}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.ticketImageUpload.create({
      data: {
        id,
        merchantId: merchant.id,
        staffId,
        stagingKey,
        finalKey,
        contentType: body.data.contentType,
        size: body.data.size,
        expiresAt,
      },
    });
    const upload = await createS3MerchantUploadStorage().createUploadPost({
      key: stagingKey,
      contentType: body.data.contentType,
      expiresInSeconds: 300,
    });
    return privateJson({ uploadId: id, expiresAt: expiresAt.toISOString(), upload }, { status: 201 });
  } catch (error) {
    console.error("Failed to presign ticket image", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return apiError("UPLOAD_SIGNING_FAILED", "이미지 업로드를 준비하지 못했습니다.", 503);
  }
}
