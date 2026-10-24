import { STAFF_PUSH_CLEANUP_TTL_SECONDS } from "@makkigo/auth";

import type { NextResponse } from "next/server";

const STAFF_PUSH_CLEANUP_COOKIE = "makkigo_staff_push_cleanup";
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1",
} as const;

const setStaffPushCleanupCookie = (response: NextResponse, capability: string) => {
  response.cookies.set(STAFF_PUSH_CLEANUP_COOKIE, capability, {
    ...options,
    maxAge: STAFF_PUSH_CLEANUP_TTL_SECONDS,
  });
};

const clearStaffPushCleanupCookie = (response: NextResponse) => {
  response.cookies.set(STAFF_PUSH_CLEANUP_COOKIE, "", { ...options, maxAge: 0 });
};

export {
  STAFF_PUSH_CLEANUP_COOKIE,
  clearStaffPushCleanupCookie,
  setStaffPushCleanupCookie,
};
