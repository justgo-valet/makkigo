import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

const hasInternalToken = (request: NextRequest, configured: string | undefined) => {
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;
  const expectedBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(authorization.slice("Bearer ".length));
  return (
    expectedBytes.length >= 32 &&
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
};

export { hasInternalToken };
