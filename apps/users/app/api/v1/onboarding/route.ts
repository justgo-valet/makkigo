import { NextResponse } from "next/server";

import { completeOnboardingRequestSchema } from "@/libs/onboarding/contracts/onboarding";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { hasRequiredConsents } from "@/server/consent/hasRequiredConsents";
import { completeOnboarding } from "@/server/onboarding/completeOnboarding";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INVALID_REQUEST: "입력한 정보를 확인해주세요.",
  REQUIRED_CONSENTS_MISSING: "필수 약관에 먼저 동의해주세요.",
  ALREADY_COMPLETED: "이미 온보딩을 완료했습니다.",
  DUPLICATE_PHONE: "이미 등록된 휴대폰 번호입니다.",
  DUPLICATE_VEHICLE: "이미 등록된 차량 번호입니다.",
  INTERNAL_SERVER_ERROR: "정보를 저장하지 못했습니다.",
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = completeOnboardingRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    if (!(await hasRequiredConsents(userId))) {
      return NextResponse.json(
        { code: "REQUIRED_CONSENTS_MISSING", message: ERROR_MESSAGES.REQUIRED_CONSENTS_MISSING },
        { status: 403 },
      );
    }

    const result = await completeOnboarding(userId, body.data);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: 409 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to complete onboarding", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
