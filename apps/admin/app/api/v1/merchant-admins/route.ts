import { merchantAdminCreateBodySchema } from "@/libs/merchantAdmin/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { createMerchantAdmin } from "@/server/merchantAdmin/merchantAdmins";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const body = merchantAdminCreateBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "아이디와 이름을 확인해 주세요.", 400);
    const result = await createMerchantAdmin(body.data);
    if (!result.ok) {
      if (result.reason === "INVALID_LOGIN_ID") {
        return apiError("INVALID_LOGIN_ID", "아이디는 영문 소문자 · 숫자 · . _ - 로 4~32자여야 합니다.", 400);
      }
      if (result.reason === "MERCHANT_NOT_FOUND") return apiError("MERCHANT_NOT_FOUND", "업체를 찾을 수 없습니다.", 404);
      return apiError("DUPLICATE_LOGIN_ID", "이미 쓰고 있는 아이디입니다.", 409);
    }
    return privateJson({ id: result.id, temporaryPassword: result.temporaryPassword }, { status: 201 });
  } catch (error) {
    logError("Failed to create merchant admin", error);
    return apiError("MERCHANT_ADMIN_SAVE_FAILED", "업체 관리자를 만들지 못했습니다.", 500);
  }
}
