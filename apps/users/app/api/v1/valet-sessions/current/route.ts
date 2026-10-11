import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getCurrentValetSession } from "@/server/valet/getCurrentValetSession";

import type { CurrentValetSessionResponse } from "@/libs/valet/contracts/currentSession";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  GET_SESSION_FAILED: "발렛 진행 상황을 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    return NextResponse.json<CurrentValetSessionResponse>(await getCurrentValetSession(userId));
  } catch (error) {
    console.error("Failed to get current valet session", error);

    return NextResponse.json({ message: ERROR_MESSAGES.GET_SESSION_FAILED }, { status: 500 });
  }
}
