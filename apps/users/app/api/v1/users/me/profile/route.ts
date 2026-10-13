import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getProfile } from "@/server/user/getProfile";

import type { ProfileResponse } from "@/libs/user/contracts/profile";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  GET_PROFILE_FAILED: "내 정보를 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    return NextResponse.json<ProfileResponse>(await getProfile(userId));
  } catch (error) {
    console.error("Failed to get profile", error);

    return NextResponse.json({ message: ERROR_MESSAGES.GET_PROFILE_FAILED }, { status: 500 });
  }
}
