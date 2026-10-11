import { NextResponse } from "next/server";

import { updatePhoneNumberRequestSchema } from "@/libs/user/contracts/phoneNumber";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { updatePhoneNumber } from "@/server/user/updatePhoneNumber";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INVALID_REQUEST: "휴대폰 번호를 확인해주세요.",
  DUPLICATE_PHONE: "이미 등록된 휴대폰 번호입니다.",
  INTERNAL_SERVER_ERROR: "휴대폰 번호를 바꾸지 못했습니다.",
} as const;

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = updatePhoneNumberRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    const result = await updatePhoneNumber(userId, body.data.phoneNumber);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: 409 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to update phone number", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
