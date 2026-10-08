import { getActiveUserIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import MemberGate from "@/features/auth/components/MemberGate";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";

import type { ReactNode } from "react";

export default async function MemberLayout({ children }: Readonly<{ children: ReactNode }>) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const userId = accessToken ? await getActiveUserIdFromAccessToken(accessToken) : null;

  if (!userId) {
    redirect("/login");
  }

  return <MemberGate area="member">{children}</MemberGate>;
}
