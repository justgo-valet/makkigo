import { NextResponse } from "next/server";

import { valetSessionIdSchema } from "@/libs/valet/contracts/arrival";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getMyActiveSession } from "@/server/valet/getCurrentSession";
import { requestPickup } from "@/server/valet/requestPickup";

import type {
  PickupRequestErrorCode,
  PickupRequestResponse,
} from "@/libs/valet/contracts/pickupRequest";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  SESSION_NOT_FOUND: "진행 중인 발렛을 찾을 수 없습니다.",
  NOT_PARKED: "아직 주차 완료되지 않은 차량입니다.",
  ALREADY_REQUESTED: "이미 출차 요청을 보냈습니다.",
  NO_BOOTH: "출차 요청을 받을 부스를 찾을 수 없습니다. 요원님께 직접 말씀해주세요.",
  INTERNAL_SERVER_ERROR: "출차 요청을 보내지 못했습니다.",
} as const;

const ERROR_STATUSES: Record<PickupRequestErrorCode, number> = {
  SESSION_NOT_FOUND: 404,
  NOT_PARKED: 409,
  ALREADY_REQUESTED: 409,
  NO_BOOTH: 422,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const valetSessionId = valetSessionIdSchema.safeParse((await params).id);

    if (!valetSessionId.success) {
      return NextResponse.json(
        { code: "SESSION_NOT_FOUND", message: ERROR_MESSAGES.SESSION_NOT_FOUND },
        { status: 404 },
      );
    }

    const result = await requestPickup(userId, valetSessionId.data);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: ERROR_STATUSES[result.reason] },
      );
    }

    const body: PickupRequestResponse = {
      session: await getMyActiveSession(userId, valetSessionId.data),
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("Failed to request pickup", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
