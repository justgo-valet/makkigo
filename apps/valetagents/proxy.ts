import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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
      has: [{ type: "cookie", key: "makkigo_staff_session" }],
      missing: [
        { type: "cookie", key: "makkigo_staff_access_token" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
