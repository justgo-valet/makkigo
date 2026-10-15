import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/server/auth/authCookies";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getMe } from "@/server/user/getMe";
import { withdrawUser } from "@/server/user/withdrawUser";

import type { MeResponse } from "@/libs/user/contracts/me";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  GET_ME_FAILED: "회원 정보를 불러오지 못했습니다.",
  ACTIVE_VALET_SESSION: "진행 중인 발렛이 있어 탈퇴할 수 없습니다.",
  INTERNAL_SERVER_ERROR: "회원 탈퇴를 처리하지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    return NextResponse.json<MeResponse>(await getMe(userId));
  } catch (error) {
    console.error("Failed to get me", error);

    return NextResponse.json({ message: ERROR_MESSAGES.GET_ME_FAILED }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const result = await withdrawUser(userId);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: 409 },
      );
    }

    const response = new NextResponse(null, { status: 204 });
    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error("Failed to withdraw user", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
