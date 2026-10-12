import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHeader from "@/components/layouts/AppHeader";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function Home() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);
  if ((await getPathAfterLogin(staffId)) === "/onboarding") redirect("/onboarding");

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <AppHeader menu={menu} />
      <div><h1>Valet Agents</h1><p>발렛 에이전트 앱이 준비되었습니다.</p></div>
    </div>
  );
}
