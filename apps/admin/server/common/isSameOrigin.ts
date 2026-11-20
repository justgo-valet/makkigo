import "server-only";

import type { NextRequest } from "next/server";

export const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};
