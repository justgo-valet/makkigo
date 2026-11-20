import "server-only";

import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getMerchantAdminFromToken } from "@/server/auth/merchantAdminSession";

import { apiError } from "./apiResponse";
import { isSameOrigin } from "./isSameOrigin";

import type { NextRequest } from "next/server";

export const requireMerchantAdminRequest = async (request: NextRequest) => {
  if (request.method !== "GET" && !isSameOrigin(request)) {
    return { error: apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403) };
  }
  const merchantAdmin = await getMerchantAdminFromToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  if (!merchantAdmin) return { error: apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401) };
  if (merchantAdmin.passwordChangeRequired) {
    return { error: apiError("PASSWORD_CHANGE_REQUIRED", "비밀번호를 먼저 바꿔 주세요.", 403) };
  }
  if (!merchantAdmin.merchant) {
    return { error: apiError("MERCHANT_REQUIRED", "연결된 업체가 없습니다. 운영팀에 문의해 주세요.", 403) };
  }
  return { merchantAdminId: merchantAdmin.id, merchantId: merchantAdmin.merchant.id };
};
