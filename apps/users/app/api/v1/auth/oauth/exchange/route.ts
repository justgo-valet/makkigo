import { consumeUserLoginCode, issueUserTokens } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { clearAppLoginVerifierCookie, getAppLoginVerifierCookie } from "@/server/auth/oauthCookies";
import { getLoginErrorUrl, toPublicUrl } from "@/server/auth/oauthUrls";

import type { NextRequest } from "next/server";

const redirectTo = (url: URL) => {
  const response = NextResponse.redirect(url, 303);
  clearAppLoginVerifierCookie(response);

  return response;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const verifier = getAppLoginVerifierCookie(request);

  if (searchParams.get("error") === "cancelled") {
    return redirectTo(getLoginErrorUrl("cancelled"));
  }

  if (!code || !verifier) {
    return redirectTo(getLoginErrorUrl("failed"));
  }

  try {
    const userId = await consumeUserLoginCode(code, verifier);

    if (!userId) {
      return redirectTo(getLoginErrorUrl("failed"));
    }

    const tokens = await issueUserTokens(userId, request.headers.get("user-agent"));
    const response = redirectTo(toPublicUrl(await getPathAfterLogin(userId)));
    setAuthCookies(response, tokens);

    return response;
  } catch (error) {
    console.error("Failed to exchange login code", error);

    return redirectTo(getLoginErrorUrl("failed"));
  }
}
