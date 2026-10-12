import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  // Early shell UX only. Every protected page and API performs its own fresh check.
  await requireProtectedStaff(staffId);
  return children;
}
