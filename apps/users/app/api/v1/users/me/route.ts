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

    await withdrawUser(userId);

    const response = new NextResponse(null, { status: 204 });
    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error("Failed to withdraw user", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
