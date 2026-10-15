import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { getProtectedStaffAccess } from "@/server/onboarding/getProtectedStaffAccess";
import { listOwnTickets } from "@/server/ticket/listOwnTickets";
import { saveTicket } from "@/server/ticket/saveTicket";
import { ticketEditorSaveBodySchema } from "@/libs/ticket/contracts/ticketEditor";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const access = await getProtectedStaffAccess(staffId);
    if (!access.ok) {
      const status = access.reason === "AUTH_REQUIRED" ? 401 : 403;
      return apiError(access.reason, "업체 온보딩을 완료해 주세요.", status);
    }
    if (access.onboarding.role !== "MERCHANT_ADMIN") {
      return apiError(
        "MERCHANT_ADMIN_REQUIRED",
        "업체 관리자만 티켓을 관리할 수 있습니다.",
        403,
      );
    }

    return privateJson(await listOwnTickets(staffId));
  } catch (error) {
    console.error("Failed to list tickets", error);
    return apiError("INTERNAL_ERROR", "티켓 목록을 불러오지 못했습니다.", 500);
  }
}

const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const access = await getProtectedStaffAccess(staffId);
    if (!access.ok) return apiError(access.reason, "업체 온보딩을 완료해 주세요.", access.reason === "AUTH_REQUIRED" ? 401 : 403);
    if (access.onboarding.role !== "MERCHANT_ADMIN") {
      return apiError("MERCHANT_ADMIN_REQUIRED", "업체 관리자만 티켓을 관리할 수 있습니다.", 403);
    }
    if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
    const body = ticketEditorSaveBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "티켓 디자인이 올바르지 않습니다.", 400);
    const result = await saveTicket({ staffId, ...body.data });
    if (result.kind === "SAVED") {
      return privateJson({ ticketId: result.ticketId }, { status: body.data.ticketId === undefined ? 201 : 200 });
    }
    if (result.kind === "ASSET_NOT_FOUND") return apiError("TICKET_IMAGE_REQUIRED", "이 업체의 업로드 이미지만 사용할 수 있습니다.", 400);
    if (result.kind === "INVALID") return apiError("INVALID_INPUT", "티켓 디자인이 올바르지 않습니다.", 400);
    return apiError("TICKET_NOT_FOUND", "티켓 또는 업체를 찾을 수 없습니다.", 404);
  } catch (error) {
    console.error("Failed to save ticket", error);
    return apiError("INTERNAL_ERROR", "티켓을 저장하지 못했습니다.", 500);
  }
}
