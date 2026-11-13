import "server-only";

import { getMerchantAdminId } from "@/server/auth/staffSession";

import { apiError } from "./apiResponse";
import { isSameOrigin } from "./isSameOrigin";

import type { NextRequest } from "next/server";

export const requireMerchantAdminRequest = async (request: NextRequest) => {
  const access = await getMerchantAdminId(request);
  if (!access.ok) {
    return access.status === 401
      ? { error: apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401) }
      : { error: apiError("MERCHANT_ADMIN_REQUIRED", "업체 관리자만 티켓을 관리할 수 있습니다.", 403) };
  }
  if (!isSameOrigin(request)) return { error: apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403) };
  return { staffId: access.staffId };
};
