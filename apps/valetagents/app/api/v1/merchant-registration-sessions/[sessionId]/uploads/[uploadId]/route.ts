import { z } from "zod";

import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import {
  createMerchantUploadSessionService,
  prismaMerchantUploadSessionRepository,
} from "@/server/merchantUploads/merchantUploadSessions";
import { registrationAccessError } from "@/server/merchantUploads/sessionRouteSupport";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";

import type { NextRequest } from "next/server";

const paramsSchema = z.object({ sessionId: z.string().uuid(), uploadId: z.string().uuid() });
const REMOVE_ERRORS = {
  SESSION_NOT_FOUND: ["SESSION_NOT_FOUND", "등록 세션을 찾을 수 없습니다.", 404],
  SESSION_FORBIDDEN: ["SESSION_FORBIDDEN", "다른 사용자의 등록 세션입니다.", 403],
  UPLOAD_NOT_FOUND: ["UPLOAD_NOT_FOUND", "업로드를 찾을 수 없습니다.", 404],
  UPLOAD_FORBIDDEN: ["UPLOAD_FORBIDDEN", "다른 등록 세션의 업로드입니다.", 403],
  SESSION_EXPIRED: ["SESSION_EXPIRED", "등록 세션이 만료되었습니다.", 410],
  SESSION_FROZEN: ["SESSION_FROZEN", "처리 중인 등록 세션은 변경할 수 없습니다.", 409],
  UPLOAD_NOT_REMOVABLE: ["UPLOAD_NOT_REMOVABLE", "이 업로드는 제거할 수 없습니다.", 409],
} as const;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; uploadId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const access = await getMerchantRegistrationAccess(staffId);
    if (!access.ok) return registrationAccessError(access);
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) return apiError("UPLOAD_NOT_FOUND", "업로드를 찾을 수 없습니다.", 404);

    const service = createMerchantUploadSessionService({
      repository: prismaMerchantUploadSessionRepository,
    });
    const result = await service.revoke(
      staffId,
      params.data.sessionId,
      params.data.uploadId,
    );
    if (result.kind !== "REVOKED") {
      const [code, message, status] = REMOVE_ERRORS[result.kind];
      return apiError(code, message, status);
    }
    return privateJson({ code: "UPLOAD_REVOKED", uploadId: result.uploadId });
  } catch (error) {
    console.error("Failed to revoke merchant image upload", error);
    return apiError("INTERNAL_ERROR", "이미지 업로드를 제거하지 못했습니다.", 500);
  }
}
