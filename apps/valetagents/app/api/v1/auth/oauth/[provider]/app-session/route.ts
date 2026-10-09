import { createAppLoginVerifier, parseSocialProvider } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { setAppLoginVerifierCookie } from "@/server/auth/oauthCookies";

import type { AppLoginSession } from "@/libs/auth/contracts/appLoginSession";

export async function POST(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = parseSocialProvider((await params).provider);
  if (!provider) return NextResponse.json({ message: "지원하지 않는 소셜 로그인입니다." }, { status: 404 });
  const { verifier, appChallenge } = createAppLoginVerifier();
  const session: AppLoginSession = {
    authUrl: `/api/v1/auth/oauth/${provider.toLowerCase()}?${new URLSearchParams({ app_challenge: appChallenge })}`,
    returnUrl: "/api/v1/auth/oauth/exchange",
  };
  const response = NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  setAppLoginVerifierCookie(response, verifier);
  return response;
}
