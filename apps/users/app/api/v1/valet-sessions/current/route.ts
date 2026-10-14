import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getCurrentSession } from "@/server/valet/getCurrentSession";

import type { CurrentSessionResponse } from "@/libs/valet/contracts/currentSession";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INTERNAL_SERVER_ERROR: "발렛 정보를 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body: CurrentSessionResponse = { session: await getCurrentSession(userId) };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to get current valet session", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
