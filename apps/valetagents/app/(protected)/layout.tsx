import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppSessionBridge from "@/features/auth/components/AppSessionBridge";
import StaffPushRegistration from "@/features/push/components/StaffPushRegistration";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { findApprovedMembership } from "@/server/booth/boothAgent";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await requireProtectedStaff(staffId);
  const requestPermission = onboarding.role === "VALET_AGENT" &&
    (await findApprovedMembership(staffId)) !== null;
  return (
    <>
      <AppSessionBridge authenticated />
      <StaffPushRegistration staffId={staffId} requestPermission={requestPermission} />
      {children}
    </>
  );
}
