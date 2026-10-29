import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SettingsContent from "@/features/settings/components/SettingsContent";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { listStaffSocialAccounts } from "@/server/auth/listStaffSocialAccounts";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function SettingsPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const next = await getPathAfterLogin(staffId);
  if (next !== "/") redirect(next);

  const [menu, socialAccounts] = await Promise.all([
    getStaffMenuAccess(staffId),
    listStaffSocialAccounts(staffId),
  ]);
  if (!menu) redirect("/login");

  return <SettingsContent staffId={staffId} menu={menu} socialAccounts={socialAccounts} />;
}
