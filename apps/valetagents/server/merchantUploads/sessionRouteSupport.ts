import "server-only";

import { apiError } from "@/server/common/apiResponse";

import type { MerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";

const registrationAccessError = (access: Extract<MerchantRegistrationAccess, { ok: false }>) => {
  if (access.reason === "AUTH_REQUIRED") {
    return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }
  if (access.reason === "MERCHANT_APPROVAL_PENDING") {
    return apiError("MERCHANT_APPROVAL_PENDING", "업체 승인을 기다리고 있습니다.", 403);
  }
  return apiError("MERCHANT_ADMIN_REQUIRED", "업체 관리자만 등록할 수 있습니다.", 403);
};

export { registrationAccessError };
