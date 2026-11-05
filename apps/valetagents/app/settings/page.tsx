import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppSessionBridge from "@/features/auth/components/AppSessionBridge";
import SettingsContent from "@/features/settings/components/SettingsContent";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { listStaffSocialAccounts } from "@/server/auth/listStaffSocialAccounts";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

export default async function SettingsPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const [menu, onboarding, socialAccounts] = await Promise.all([
    getStaffMenuAccess(staffId),
    getStaffOnboardingState(staffId),
    listStaffSocialAccounts(staffId),
  ]);
  if (!menu || !onboarding) redirect("/login");

  return (
    <>
      <AppSessionBridge authenticated />
      <SettingsContent
        staffId={staffId}
        menu={{ ...menu, onboarding: onboarding.state !== "COMPLETE" }}
        socialAccounts={socialAccounts}
      />
    </>
  );
}
