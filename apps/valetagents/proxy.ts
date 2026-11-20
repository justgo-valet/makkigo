import { nextWithContentSecurityPolicy } from "@makkigo/ui/lib/contentSecurityPolicy";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.cookies.has("makkigo_staff_session") || request.cookies.has("makkigo_staff_access_token")) {
    return nextWithContentSecurityPolicy(request);
  }

  const url = request.nextUrl.clone();
  url.pathname = "/api/v1/auth/refresh";
  url.search = new URLSearchParams({
    next: `${request.nextUrl.pathname}${request.nextUrl.search}`,
  }).toString();

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/|icons/|images/|favicon\\.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
