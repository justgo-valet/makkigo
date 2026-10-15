import { boothAgentPageSchema, boothAgentReviewBodySchema } from "@/libs/booth/contracts/agents";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { listBoothAgents } from "@/server/booth/listBoothAgents";
import { reviewBoothAgents } from "@/server/booth/reviewBoothAgents";
import { apiError, NO_STORE_HEADERS, privateJson } from "@/server/common/apiResponse";
import { getProtectedStaffAccess } from "@/server/onboarding/getProtectedStaffAccess";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_MANAGER_REQUIRED: { status: 403, message: "부스 관리자만 요원을 관리할 수 있습니다." },
  AGENT_NOT_FOUND: { status: 404, message: "요원을 찾을 수 없습니다." },
  AGENT_ALREADY_APPROVED: { status: 409, message: "이미 등록된 요원은 거절할 수 없습니다." },
  AGENT_CHANGED: {
    status: 409,
    message: "요원이 요청 내용을 바꿨습니다. 목록을 다시 확인해 주세요.",
  },
} as const;

const parseBoothId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const access = await getProtectedStaffAccess(staffId);
    if (!access.ok) {
      const status = access.reason === "AUTH_REQUIRED" ? 401 : 403;
      return apiError(access.reason, "업체 온보딩을 완료해 주세요.", status);
    }

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const page = boothAgentPageSchema.safeParse(request.nextUrl.searchParams.get("page") ?? 1);
    if (!page.success) return apiError("INVALID_PAGE", "올바른 페이지 번호가 필요합니다.", 400);

    const result = await listBoothAgents(staffId, boothId, page.data);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return privateJson(result.value);
  } catch (error) {
    console.error("Failed to list booth agents", error);
    return apiError("INTERNAL_ERROR", "요원 목록을 불러오지 못했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const access = await getProtectedStaffAccess(staffId);
    if (!access.ok) {
      const status = access.reason === "AUTH_REQUIRED" ? 401 : 403;
      return apiError(access.reason, "업체 온보딩을 완료해 주세요.", status);
    }

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const body = boothAgentReviewBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다.", 400);

    const result = await reviewBoothAgents(staffId, boothId, body.data);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to review booth agents", error);
    return apiError("INTERNAL_ERROR", "요원 등록 상태를 바꾸지 못했습니다.", 500);
  }
}
