import { NextResponse } from "next/server";

import { valetSessionIdSchema } from "@/libs/valet/contracts/arrival";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { cancelArrivalSession } from "@/server/valet/cancelArrivalSession";

import type { CancelArrivalErrorCode } from "@/libs/valet/contracts/arrival";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  SESSION_NOT_FOUND: "도착 알림을 찾을 수 없습니다.",
  NOT_CANCELLABLE: "이미 취소했거나 주차가 시작되어 취소할 수 없습니다.",
  INTERNAL_SERVER_ERROR: "도착 알림을 취소하지 못했습니다.",
} as const;

const ERROR_STATUSES: Record<CancelArrivalErrorCode, number> = {
  SESSION_NOT_FOUND: 404,
  NOT_CANCELLABLE: 409,
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

    const result = await cancelArrivalSession(userId, valetSessionId.data);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: ERROR_STATUSES[result.reason] },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to cancel arrival notification", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
