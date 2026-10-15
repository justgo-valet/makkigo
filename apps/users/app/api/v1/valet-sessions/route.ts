import { pushStaffNotifications } from "@makkigo/push";
import { after, NextResponse } from "next/server";

import { sendArrivalRequestSchema } from "@/libs/valet/contracts/arrival";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { createArrivalSession } from "@/server/valet/createArrivalSession";

import type { ArrivalErrorCode } from "@/libs/valet/contracts/arrival";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INVALID_REQUEST: "업체를 다시 선택해주세요.",
  VEHICLE_REQUIRED: "차량을 먼저 등록해주세요.",
  MERCHANT_NOT_FOUND: "업체를 찾을 수 없습니다.",
  ACTIVE_SESSION_EXISTS: "이미 진행 중인 발렛이 있습니다.",
  NO_AVAILABLE_BOOTH: "지금은 발렛을 받을 수 없는 업체입니다.",
  INTERNAL_SERVER_ERROR: "도착 알림을 보내지 못했습니다.",
} as const;

const ERROR_STATUSES: Record<ArrivalErrorCode, number> = {
  VEHICLE_REQUIRED: 403,
  MERCHANT_NOT_FOUND: 404,
  ACTIVE_SESSION_EXISTS: 409,
  NO_AVAILABLE_BOOTH: 422,
};

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = sendArrivalRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    const result = await createArrivalSession(userId, body.data);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: ERROR_STATUSES[result.reason] },
      );
    }

    after(() => pushStaffNotifications(result.notificationIds));

    return NextResponse.json({ id: result.valetSessionId }, { status: 201 });
  } catch (error) {
    console.error("Failed to send arrival notification", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
