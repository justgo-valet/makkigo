import { merchantImageReservationBodySchema } from "@/libs/merchant/contracts/image-upload";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import {
  createMerchantUploadSessionService,
  prismaMerchantUploadSessionRepository,
} from "@/server/merchantUploads/merchantUploadSessions";
import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";
import { registrationAccessError } from "@/server/merchantUploads/sessionRouteSupport";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";

import type { NextRequest } from "next/server";

const RESERVATION_ERRORS = {
  NOT_FOUND: ["SESSION_NOT_FOUND", "등록 세션을 찾을 수 없습니다.", 404],
  FORBIDDEN: ["SESSION_FORBIDDEN", "다른 사용자의 등록 세션입니다.", 403],
  SESSION_EXPIRED: ["SESSION_EXPIRED", "등록 세션이 만료되었습니다.", 410],
  SESSION_FROZEN: ["SESSION_FROZEN", "처리 중인 등록 세션은 변경할 수 없습니다.", 409],
  SLOTS_FULL: ["SLOTS_FULL", "사진은 최대 5장까지 업로드할 수 있습니다.", 409],
  UPLOAD_NOT_FOUND: ["UPLOAD_NOT_FOUND", "업로드 예약을 찾을 수 없습니다.", 404],
  UPLOAD_FORBIDDEN: ["UPLOAD_FORBIDDEN", "다른 등록 세션의 업로드입니다.", 403],
  UPLOAD_NOT_REFRESHABLE: ["UPLOAD_NOT_REFRESHABLE", "이 업로드 예약은 갱신할 수 없습니다.", 409],
  UPLOAD_MISMATCH: ["UPLOAD_MISMATCH", "기존 업로드 예약과 이미지 정보가 다릅니다.", 409],
} as const;

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const access = await getMerchantRegistrationAccess(staffId);
    if (!access.ok) return registrationAccessError(access);
    const body = merchantImageReservationBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "이미지 정보가 올바르지 않습니다.", 400);

    const service = createMerchantUploadSessionService({
      repository: prismaMerchantUploadSessionRepository,
      storage: createS3MerchantUploadStorage(),
    });
    const result = await service.reserveAndSign({ staffId, ...body.data });
    if (result.kind !== "SIGNED") {
      const [code, message, status] = RESERVATION_ERRORS[result.kind];
      return apiError(code, message, status);
    }
    return privateJson(
      {
        code: body.data.uploadId ? "UPLOAD_POST_REFRESHED" : "UPLOAD_RESERVED",
        uploadId: result.upload.id,
        slot: result.upload.slot,
        expiresAt: result.upload.expiresAt.toISOString(),
        upload: result.post,
      },
      { status: body.data.uploadId ? 200 : 201 },
    );
  } catch (error) {
    console.error("Failed to reserve merchant image upload", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError("UPLOAD_SIGNING_FAILED", "이미지 업로드를 준비하지 못했습니다.", 503);
  }
}
