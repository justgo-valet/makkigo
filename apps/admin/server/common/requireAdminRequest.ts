import "server-only";

import { getAdminId } from "@/server/auth/adminSession";

import { apiError } from "./apiResponse";
import { isSameOrigin } from "./isSameOrigin";

import type { NextRequest } from "next/server";

export const requireAdminRequest = async (request: NextRequest) => {
  const adminId = await getAdminId(request);
  if (!adminId) return { error: apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401) };
  if (request.method !== "GET" && !isSameOrigin(request)) {
    return { error: apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403) };
  }
  return { adminId };
};
