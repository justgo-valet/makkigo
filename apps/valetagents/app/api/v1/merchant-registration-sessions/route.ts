import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import {
  createMerchantUploadSessionService,
  prismaMerchantUploadSessionRepository,
  serializeSession,
} from "@/server/merchantUploads/merchantUploadSessions";
import { registrationAccessError } from "@/server/merchantUploads/sessionRouteSupport";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const access = await getMerchantRegistrationAccess(staffId);
    if (!access.ok) return registrationAccessError(access);

    const service = createMerchantUploadSessionService({
      repository: prismaMerchantUploadSessionRepository,
    });
    const result = await service.createOrResume(staffId);
    if (result.kind === "UNRESOLVED") {
      return privateJson(
        { code: "UNRESOLVED_SUBMISSION", ...serializeSession(result.session) },
        { status: 409 },
      );
    }
    return privateJson(
      { code: result.resumed ? "SESSION_RESUMED" : "SESSION_CREATED", ...serializeSession(result.session) },
      { status: result.resumed ? 200 : 201 },
    );
  } catch (error) {
    console.error("Failed to create merchant registration session", error);
    return apiError("INTERNAL_ERROR", "업체 등록 세션을 만들지 못했습니다.", 500);
  }
}
