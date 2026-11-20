import { NextResponse } from "next/server";

import { staffNotificationsCursorSchema } from "@/libs/notification/contracts/notifications";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { listStaffNotifications } from "@/server/notification/listStaffNotifications";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const rawCursor = request.nextUrl.searchParams.get("cursor");
    const cursor = rawCursor === null ? null : staffNotificationsCursorSchema.safeParse(rawCursor);
    if (cursor && !cursor.success) {
      return NextResponse.json({ code: "INVALID_CURSOR", message: "알림 목록을 다시 불러와 주세요." }, { status: 400 });
    }

    return NextResponse.json(await listStaffNotifications(staffId, cursor?.data ?? null), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to list staff notifications", error);
    return NextResponse.json({ message: "알림을 불러오지 못했습니다." }, { status: 500 });
  }
}
