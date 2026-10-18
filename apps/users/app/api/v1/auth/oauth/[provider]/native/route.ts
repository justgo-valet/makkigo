import {
  AuthConfigError,
  completeUserNativeLogin,
  issueUserTokens,
  parseSocialProvider,
  SocialAuthError,
} from "@makkigo/auth";
import { NextResponse } from "next/server";

import { nativeLoginRequestSchema } from "@/libs/auth/contracts/nativeLogin";
import { setAuthCookies } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";

import type { NativeLoginResponse } from "@/libs/auth/contracts/nativeLogin";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNSUPPORTED_PROVIDER: "지원하지 않는 소셜 로그인입니다.",
  INVALID_REQUEST: "로그인 정보를 확인해주세요.",
  REJECTED: "소셜 로그인 정보를 확인하지 못했습니다.",
  FAILED: "로그인하지 못했습니다.",
} as const;

/**
 * 앱(웹뷰)에서 제공자 SDK 로 로그인한 결과를 받아 우리 토큰 쿠키를 심는다.
 * 다른 사이트의 폼이 로그인 요청을 보내지 못하도록(로그인 CSRF) JSON 요청만 받는다. JSON 은 다른 출처에서 보내려면 CORS 확인을 거쳐야 한다.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const provider = parseSocialProvider((await params).provider);

  if (!provider) {
    return NextResponse.json({ message: ERROR_MESSAGES.UNSUPPORTED_PROVIDER }, { status: 404 });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 415 });
  }

  const body = nativeLoginRequestSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const { userId } = await completeUserNativeLogin({ provider, credential: body.data });
    const tokens = await issueUserTokens(userId, request.headers.get("user-agent"));
    const result: NativeLoginResponse = { redirectTo: await getPathAfterLogin(userId) };
    const response = NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    setAuthCookies(response, tokens);

    return response;
  } catch (error) {
    if (error instanceof SocialAuthError) {
      console.warn("Native social login rejected", error.message);

      return NextResponse.json({ message: ERROR_MESSAGES.REJECTED }, { status: 401 });
    }

    if (error instanceof AuthConfigError) {
      console.error("Auth configuration error", error.message);
    } else {
      console.error("Failed to complete native social login", error);
    }

    return NextResponse.json({ message: ERROR_MESSAGES.FAILED }, { status: 500 });
  }
}
