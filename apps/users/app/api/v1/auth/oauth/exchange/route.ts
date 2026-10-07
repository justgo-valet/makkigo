import { consumeUserLoginCode, issueUserTokens } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { getLoginErrorUrl, toPublicUrl } from "@/server/auth/oauthUrls";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const verifier = request.nextUrl.searchParams.get("verifier");

  if (!code || !verifier) {
    return NextResponse.redirect(getLoginErrorUrl("failed"), 303);
  }

  try {
    const userId = await consumeUserLoginCode(code, verifier);

    if (!userId) {
      return NextResponse.redirect(getLoginErrorUrl("failed"), 303);
    }

    const tokens = await issueUserTokens(userId, request.headers.get("user-agent"));
    const response = NextResponse.redirect(toPublicUrl(await getPathAfterLogin(userId)), 303);
    setAuthCookies(response, tokens);

    return response;
  } catch (error) {
    console.error("Failed to exchange login code", error);

    return NextResponse.redirect(getLoginErrorUrl("failed"), 303);
  }
}
