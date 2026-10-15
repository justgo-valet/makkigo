import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ComingSoon from "@/components/layouts/ComingSoon";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function SettingsPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const next = await getPathAfterLogin(staffId);
  if (next !== "/") redirect(next);

  return <ComingSoon title="설정 기능을 준비하고 있어요" />;
}
