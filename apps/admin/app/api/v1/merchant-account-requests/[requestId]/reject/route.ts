import { NextResponse } from "next/server";

import { apiError } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { rejectMerchantAccountRequest } from "@/server/merchantAccountRequest/merchantAccountRequests";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const requestId = parseId((await params).requestId);
    if (!requestId || !(await rejectMerchantAccountRequest(requestId))) {
      return apiError("REQUEST_NOT_PENDING", "처리할 수 있는 요청이 아닙니다.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to reject merchant account request", error);
    return apiError("REQUEST_REJECT_FAILED", "요청을 거절하지 못했습니다.", 500);
  }
}
