import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";

import type { ReactNode } from "react";

export default async function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  if ((await getPathAfterLogin(staffId)) === "/") redirect("/");
  return <section className="h-full">{children}</section>;
}
