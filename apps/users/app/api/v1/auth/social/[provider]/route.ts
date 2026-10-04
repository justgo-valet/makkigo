import {
  AuthConfigError,
  InvalidSocialTokenError,
  parseSocialProvider,
  signInUserWithSocial,
} from "@makkigo/auth";
import { NextResponse } from "next/server";

import { socialLoginRequestSchema } from "@/libs/auth/contracts/socialLogin";
import { setAuthCookies } from "@/server/auth/authCookies";

import type { SocialLoginResponse } from "@/libs/auth/contracts/socialLogin";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNSUPPORTED_PROVIDER: "지원하지 않는 소셜 로그인입니다.",
  INVALID_REQUEST: "소셜 토큰이 필요합니다.",
  INVALID_TOKEN: "소셜 로그인 정보를 확인하지 못했습니다. 다시 로그인해주세요.",
  INTERNAL_SERVER_ERROR: "로그인을 처리하지 못했습니다.",
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const provider = parseSocialProvider((await params).provider);

  if (!provider) {
    return NextResponse.json({ message: ERROR_MESSAGES.UNSUPPORTED_PROVIDER }, { status: 404 });
  }

  const body = socialLoginRequestSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const result = await signInUserWithSocial({
      provider,
      token: body.data.token,
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json<SocialLoginResponse>({ isNewUser: result.isNewUser });
    setAuthCookies(response, result);

    return response;
  } catch (error) {
    if (error instanceof InvalidSocialTokenError) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_TOKEN }, { status: 401 });
    }

    if (error instanceof AuthConfigError) {
      console.error("Auth configuration error", error.message);
    } else {
      console.error("Failed to sign in with social", error);
    }

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
