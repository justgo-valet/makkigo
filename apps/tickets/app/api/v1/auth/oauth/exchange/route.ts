import { consumeStaffLoginCode, issueStaffTokens } from "@makkigo/auth";
import { NextResponse } from "next/server";

import { clearLoginVerifierCookie, getLoginVerifierCookie, setAuthCookies } from "@/server/auth/authCookies";
import { toPublicUrl } from "@/server/auth/oauthUrls";
import { isMerchantAdmin } from "@/server/auth/staffSession";

import type { NextRequest } from "next/server";

const redirectTo = (path: string) => {
  const response = NextResponse.redirect(toPublicUrl(path), 303);
  clearLoginVerifierCookie(response);
  return response;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const verifier = getLoginVerifierCookie(request);
  if (!code || !verifier) return redirectTo("/login?error=failed");
  try {
    const staffId = await consumeStaffLoginCode(code, verifier);
    if (!staffId) return redirectTo("/login?error=failed");
    if (!(await isMerchantAdmin(staffId))) return redirectTo("/login?error=role");
    const tokens = await issueStaffTokens(staffId, request.headers.get("user-agent"));
    const response = redirectTo("/");
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    console.error("Failed to exchange tickets login code", error);
    return redirectTo("/login?error=failed");
  }
}
