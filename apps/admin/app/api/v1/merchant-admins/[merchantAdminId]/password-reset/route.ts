import { resetMerchantAdminPassword } from "@makkigo/auth";

import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { merchantAdminExists } from "@/server/merchantAdmin/merchantAdmins";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ merchantAdminId: string }> }) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const merchantAdminId = parseId((await params).merchantAdminId);
    const temporaryPassword = merchantAdminId ? await resetMerchantAdminPassword(merchantAdminId) : null;
    if (temporaryPassword) return privateJson({ temporaryPassword });
    return merchantAdminId && (await merchantAdminExists(merchantAdminId))
      ? apiError("MERCHANT_ADMIN_DISABLED", "중지된 계정은 비밀번호를 재설정할 수 없습니다.", 409)
      : apiError("MERCHANT_ADMIN_NOT_FOUND", "업체 관리자를 찾을 수 없습니다.", 404);
  } catch (error) {
    logError("Failed to reset merchant admin password", error);
    return apiError("PASSWORD_RESET_FAILED", "비밀번호를 재설정하지 못했습니다.", 500);
  }
}
