import { createAppLoginVerifier, parseSocialProvider, startStaffOAuth } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { setOAuthCookies } from "@/server/auth/authCookies";
import { getOAuthRedirectUri, toPublicUrl } from "@/server/auth/oauthUrls";

import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const provider = parseSocialProvider((await params).provider);
  if (!provider) return NextResponse.json({ message: "지원하지 않는 소셜 로그인입니다." }, { status: 404 });
  try {
    const login = createAppLoginVerifier();
    const { authorizationUrl, csrf } = await startStaffOAuth({
      provider,
      redirectUri: getOAuthRedirectUri(provider),
      client: "tickets",
      appChallenge: login.appChallenge,
    });
    const response = NextResponse.redirect(authorizationUrl);
    setOAuthCookies(response, { csrf, verifier: login.verifier });
    return response;
  } catch (error) {
    console.error("Failed to start tickets social login", error);
    return NextResponse.redirect(toPublicUrl("/login?error=failed"));
  }
}
