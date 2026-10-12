import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { getActiveStaffRole } from "@/server/auth/getActiveStaffRole";
import { createBooth } from "@/server/booth/createBooth";
import { searchBooths } from "@/server/booth/searchBooths";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { boothSearchQuerySchema } from "@/libs/booth/contracts/booths";
import { createBoothBodySchema } from "@/libs/booth/contracts/create-booth";

import type { NextRequest } from "next/server";

const CREATE_ERROR_RESPONSES = {
  AUTH_REQUIRED: { status: 401, message: "로그인이 필요합니다." },
  VALET_AGENT_REQUIRED: { status: 403, message: "발렛 요원만 부스를 등록할 수 있습니다." },
  ALREADY_ONBOARDED: { status: 403, message: "이미 부스에 등록된 요원은 부스를 등록할 수 없습니다." },
  REQUEST_CONFLICT: { status: 409, message: "요청이 동시에 변경되었습니다. 다시 시도해 주세요." },
} as const;

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const role = await getActiveStaffRole(staffId);
    if (role === undefined) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (role !== "VALET_AGENT") {
      return apiError("VALET_AGENT_REQUIRED", "발렛 요원만 부스를 검색할 수 있습니다.", 403);
    }

    const query = boothSearchQuerySchema.safeParse(request.nextUrl.searchParams.get("q"));
    if (!query.success) {
      return apiError("INVALID_QUERY", "검색어를 1자 이상 50자 이하로 입력해 주세요.", 400);
    }

    return privateJson(await searchBooths(staffId, query.data));
  } catch (error) {
    console.error("Failed to search valet booths", error);
    return apiError("INTERNAL_ERROR", "부스를 검색하지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const body = createBoothBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다.", 400);

    const result = await createBooth(staffId, body.data);
    if (!result.ok) {
      const error = CREATE_ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return privateJson(result.value, { status: 201 });
  } catch (error) {
    console.error("Failed to create valet booth", error);
    return apiError("INTERNAL_ERROR", "부스를 등록하지 못했습니다.", 500);
  }
}
