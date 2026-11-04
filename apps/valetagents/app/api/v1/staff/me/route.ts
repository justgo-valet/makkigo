import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/server/auth/authCookies";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { clearStaffPushCleanupCookie } from "@/server/auth/pushCleanupCookie";
import { withdrawStaff } from "@/server/auth/withdrawStaff";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  ACTIVE_VALET_SESSION: "진행 중인 발렛이 있어 탈퇴할 수 없습니다.",
  INTERNAL_SERVER_ERROR: "탈퇴를 처리하지 못했습니다.",
} as const;

export async function DELETE(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);

    if (!staffId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const result = await withdrawStaff(staffId);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: 409 },
      );
    }

    const response = new NextResponse(null, { status: 204 });
    clearAuthCookies(response);
    clearStaffPushCleanupCookie(response);

    return response;
  } catch (error) {
    console.error("Failed to withdraw staff", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
