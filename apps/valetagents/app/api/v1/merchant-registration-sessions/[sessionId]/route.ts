import { z } from "zod";

import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import {
  createMerchantUploadSessionService,
  prismaMerchantUploadSessionRepository,
  serializeSession,
} from "@/server/merchantUploads/merchantUploadSessions";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

import type { NextRequest } from "next/server";

const paramsSchema = z.object({ sessionId: z.string().uuid() });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const onboarding = await getStaffOnboardingState(staffId);
    if (!onboarding) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (onboarding.role !== "MERCHANT_ADMIN") {
      return apiError("MERCHANT_ADMIN_REQUIRED", "업체 관리자만 조회할 수 있습니다.", 403);
    }
    const parsed = paramsSchema.safeParse(await context.params);
    if (!parsed.success) return apiError("SESSION_NOT_FOUND", "등록 세션을 찾을 수 없습니다.", 404);

    const service = createMerchantUploadSessionService({
      repository: prismaMerchantUploadSessionRepository,
    });
    const result = await service.getOwned(staffId, parsed.data.sessionId);
    if (result.kind === "NOT_FOUND") {
      return apiError("SESSION_NOT_FOUND", "등록 세션을 찾을 수 없습니다.", 404);
    }
    if (result.kind === "FORBIDDEN") {
      return apiError("SESSION_FORBIDDEN", "다른 사용자의 등록 세션입니다.", 403);
    }
    if (result.session.state === "EXPIRED") {
      return privateJson(
        { code: "SESSION_EXPIRED", ...serializeSession(result.session) },
        { status: 410 },
      );
    }
    return privateJson({ code: result.session.state, ...serializeSession(result.session) });
  } catch (error) {
    console.error("Failed to read merchant registration session", error);
    return apiError("INTERNAL_ERROR", "업체 등록 상태를 불러오지 못했습니다.", 500);
  }
}
