import { createAppLoginVerifier, isValidAppChallenge, parseSocialProvider, startStaffOAuth } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { setAppLoginVerifierCookie, setOAuthCsrfCookie } from "@/server/auth/oauthCookies";
import { getLoginErrorUrl, getOAuthRedirectUri } from "@/server/auth/oauthUrls";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const provider = parseSocialProvider((await params).provider);
  if (!provider) return NextResponse.json({ message: "지원하지 않는 소셜 로그인입니다." }, { status: 404 });
  const appChallenge = request.nextUrl.searchParams.get("app_challenge");
  if (appChallenge !== null && !isValidAppChallenge(appChallenge)) {
    return NextResponse.json({ message: "앱 로그인 요청이 올바르지 않습니다." }, { status: 400 });
  }
  try {
    const webLogin = appChallenge ? null : createAppLoginVerifier();
    const { authorizationUrl, csrf } = await startStaffOAuth({
      provider,
      redirectUri: getOAuthRedirectUri(provider),
      client: appChallenge ? "app" : "web",
      appChallenge: appChallenge ?? webLogin?.appChallenge ?? null,
    });
    const response = NextResponse.redirect(authorizationUrl);
    setOAuthCsrfCookie(response, csrf);
    if (webLogin) setAppLoginVerifierCookie(response, webLogin.verifier);
    return response;
  } catch (error) {
    console.error("Failed to start staff social login", error);
    return NextResponse.redirect(getLoginErrorUrl("failed"));
  }
}
