import { NextResponse } from "next/server";

import { notificationsCursorSchema } from "@/libs/notification/contracts/notifications";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getNotifications } from "@/server/notification/getNotifications";

import type { NotificationsResponse } from "@/libs/notification/contracts/notifications";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INVALID_CURSOR: "알림 목록을 다시 불러와 주세요.",
  INTERNAL_SERVER_ERROR: "알림을 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const rawCursor = request.nextUrl.searchParams.get("cursor");
    const cursor = rawCursor === null ? null : notificationsCursorSchema.safeParse(rawCursor);

    if (cursor && !cursor.success) {
      return NextResponse.json(
        { code: "INVALID_CURSOR", message: ERROR_MESSAGES.INVALID_CURSOR },
        { status: 400 },
      );
    }

    return NextResponse.json<NotificationsResponse>(
      await getNotifications(userId, cursor?.data ?? null),
    );
  } catch (error) {
    console.error("Failed to get notifications", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
