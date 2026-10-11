import { agentRequestBodySchema } from "@/libs/booth/contracts/agent-request";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { saveAgentRequest } from "@/server/booth/saveAgentRequest";
import { apiError, privateJson } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  AUTH_REQUIRED: { status: 401, message: "로그인이 필요합니다." },
  VALET_AGENT_REQUIRED: { status: 403, message: "발렛 요원만 등록을 요청할 수 있습니다." },
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  ALREADY_APPROVED: { status: 409, message: "이미 승인된 부스입니다." },
  REQUEST_CONFLICT: { status: 409, message: "요청이 동시에 변경되었습니다. 다시 시도해 주세요." },
} as const;

const parseBoothId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const json = await request.json().catch(() => null);
    const body = agentRequestBodySchema.safeParse(json);
    if (!body.success) {
      const invalidWorkTime =
        typeof json === "object" &&
        json !== null &&
        !Array.isArray(json) &&
        Object.keys(json).length === 2 &&
        typeof (json as Record<string, unknown>).workStartTime === "string" &&
        typeof (json as Record<string, unknown>).workEndTime === "string";
      return invalidWorkTime
        ? apiError("INVALID_WORK_TIME", "근무 시간을 HH:mm 형식으로 입력해 주세요.", 400)
        : apiError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다.", 400);
    }

    if (body.data.workStartTime === body.data.workEndTime) {
      return apiError("INVALID_WORK_TIME", "출근 시간과 퇴근 시간은 달라야 합니다.", 400);
    }

    const result = await saveAgentRequest(staffId, boothId, body.data);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return privateJson(result.value, { status: result.value.outcome === "CREATED" ? 201 : 200 });
  } catch (error) {
    console.error("Failed to save valet booth request", error);
    return apiError("INTERNAL_ERROR", "등록 요청을 저장하지 못했습니다.", 500);
  }
}
