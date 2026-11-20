import { disableMerchantAdmin } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { apiError } from "@/server/common/apiResponse";
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
    if (!merchantAdminId || !(await merchantAdminExists(merchantAdminId))) {
      return apiError("MERCHANT_ADMIN_NOT_FOUND", "업체 관리자를 찾을 수 없습니다.", 404);
    }
    await disableMerchantAdmin(merchantAdminId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to disable merchant admin", error);
    return apiError("MERCHANT_ADMIN_DISABLE_FAILED", "계정을 중지하지 못했습니다.", 500);
  }
}
