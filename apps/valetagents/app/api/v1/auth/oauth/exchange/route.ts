import { consumeStaffLoginCode, issueStaffTokens } from "@makkigo/auth";
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
  const code = request.nextUrl.searchParams.get("code");
  const verifier = getAppLoginVerifierCookie(request);
  if (request.nextUrl.searchParams.get("error") === "cancelled") return redirectTo(getLoginErrorUrl("cancelled"));
  if (!code || !verifier) return redirectTo(getLoginErrorUrl("failed"));
  try {
    const staffId = await consumeStaffLoginCode(code, verifier);
    if (!staffId) return redirectTo(getLoginErrorUrl("failed"));
    const tokens = await issueStaffTokens(staffId, request.headers.get("user-agent"));
    const response = redirectTo(toPublicUrl(await getPathAfterLogin(staffId)));
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    console.error("Failed to exchange staff login code", error);
    return redirectTo(getLoginErrorUrl("failed"));
  }
}
