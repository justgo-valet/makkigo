import { registerStaffPushDevice, removeStaffPushDevice } from "@makkigo/push";

import {
  pushDeviceRequestSchema,
  removePushDeviceRequestSchema,
} from "@/libs/push/contracts/pushDevices";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const body = pushDeviceRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return apiError("INVALID_REQUEST", "알림 기기 정보를 확인해주세요.", 400);
    }

    await registerStaffPushDevice(staffId, body.data.token, body.data.platform);

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to register staff push device", error);
    return apiError("INTERNAL_ERROR", "알림 기기를 등록하지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const body = removePushDeviceRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return apiError("INVALID_REQUEST", "알림 기기 정보를 확인해주세요.", 400);
    }

    await removeStaffPushDevice(staffId, body.data.token);

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to remove staff push device", error);
    return apiError("INTERNAL_ERROR", "알림 기기를 삭제하지 못했습니다.", 500);
  }
}
