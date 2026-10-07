import { isValidAppChallenge, parseSocialProvider, startUserOAuth } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { setOAuthCsrfCookie } from "@/server/auth/oauthCookies";
import { getLoginErrorUrl, getOAuthRedirectUri } from "@/server/auth/oauthUrls";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNSUPPORTED_PROVIDER: "지원하지 않는 소셜 로그인입니다.",
  INVALID_APP_CHALLENGE: "앱 로그인 요청이 올바르지 않습니다.",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const provider = parseSocialProvider((await params).provider);

  if (!provider) {
    return NextResponse.json({ message: ERROR_MESSAGES.UNSUPPORTED_PROVIDER }, { status: 404 });
  }

  const appChallenge = request.nextUrl.searchParams.get("app_challenge");

  if (appChallenge !== null && !isValidAppChallenge(appChallenge)) {
    return NextResponse.json({ message: ERROR_MESSAGES.INVALID_APP_CHALLENGE }, { status: 400 });
  }

  try {
    const { authorizationUrl, csrf } = await startUserOAuth({
      provider,
      redirectUri: getOAuthRedirectUri(provider),
      client: appChallenge ? "app" : "web",
      appChallenge,
    });

    const response = NextResponse.redirect(authorizationUrl);
    setOAuthCsrfCookie(response, csrf);

    return response;
  } catch (error) {
    console.error("Failed to start social login", error);

    return NextResponse.redirect(getLoginErrorUrl("failed"));
  }
}
