import { NextResponse } from "next/server";

import {
  REQUIRED_CONSENT_TYPES,
  recordConsentsRequestSchema,
} from "@/libs/consent/contracts/consents";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { recordUserConsents } from "@/server/consent/recordUserConsents";

import type { ConsentType } from "@/libs/consent/contracts/consents";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INVALID_REQUEST: "동의 항목을 확인해주세요.",
  REQUIRED_CONSENT_DECLINED: "필수 약관에 동의해야 서비스를 이용할 수 있습니다.",
  INTERNAL_SERVER_ERROR: "약관 동의를 저장하지 못했습니다.",
} as const;

const isRequiredConsent = (type: ConsentType) =>
  (REQUIRED_CONSENT_TYPES as readonly ConsentType[]).includes(type);

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = recordConsentsRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    if (body.data.consents.some(({ type, agreed }) => isRequiredConsent(type) && !agreed)) {
      return NextResponse.json(
        { message: ERROR_MESSAGES.REQUIRED_CONSENT_DECLINED },
        { status: 400 },
      );
    }

    await recordUserConsents(userId, body.data);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to record consents", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
