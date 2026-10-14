import { after } from "next/server";

import { addVehicleRequestSchema } from "@/libs/valet/contracts/add-vehicle";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { addParkedVehicle } from "@/server/valet/addParkedVehicle";
import { listBoothValetSessions } from "@/server/valet/listBoothValetSessions";
import { notifyParked } from "@/server/valet/notifyParked";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_AGENT_REQUIRED: { status: 403, message: "부스에 등록된 요원만 이용할 수 있습니다." },
  ACTIVE_SESSION_EXISTS: { status: 409, message: "이미 맡아 둔 차량 번호입니다." },
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

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const imageBaseUrl = process.env.IMAGE_BASE_URL;
    if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");

    const result = await listBoothValetSessions(staffId, boothId, imageBaseUrl);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return privateJson(result.value);
  } catch (error) {
    console.error("Failed to list booth valet sessions", error);
    return apiError("INTERNAL_ERROR", "차량 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const body = addVehicleRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_REQUEST", "올바른 차량 번호를 입력해 주세요.", 400);

    const result = await addParkedVehicle(staffId, boothId, body.data.plateNumber);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    const { notice } = result;
    if (notice) after(() => notifyParked(notice));

    return privateJson({ id: result.valetSessionId }, { status: 201 });
  } catch (error) {
    console.error("Failed to add parked vehicle", error);
    return apiError("INTERNAL_ERROR", "차량을 추가하지 못했습니다.", 500);
  }
}
