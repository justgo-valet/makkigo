import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { readAllNotifications } from "@/server/notification/readAllNotifications";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INTERNAL_SERVER_ERROR: "알림을 읽음으로 바꾸지 못했습니다.",
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    await readAllNotifications(userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to read notifications", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
