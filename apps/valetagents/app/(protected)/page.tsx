import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHeader from "@/components/layouts/AppHeader";
import QueryProvider from "@/components/providers/QueryProvider";
import VehicleManagement from "@/features/valet/components/VehicleManagement";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { findApprovedMembership } from "@/server/booth/boothAgent";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";
import { listBoothValetSessions } from "@/server/valet/listBoothValetSessions";

const loadBoothSessions = async (staffId: number) => {
  const membership = await findApprovedMembership(staffId);
  if (!membership) return null;
  const { boothId } = membership;

  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");

  const sessions = await listBoothValetSessions(staffId, boothId, imageBaseUrl);
  return sessions.ok
    ? {
        boothId,
        data: sessions.value,
        loadedAt: Date.now(),
        hasWorkTime: membership.workStartTime !== null && membership.workEndTime !== null,
      }
    : null;
};

export default async function Home() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);
  if ((await getPathAfterLogin(staffId)) === "/onboarding") redirect("/onboarding");

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  const booth = await loadBoothSessions(staffId);

  if (booth) {
    return (
      <QueryProvider sessionKey={staffId}>
        <VehicleManagement
          staffId={staffId}
          boothId={booth.boothId}
          initialData={booth.data}
          initialDataUpdatedAt={booth.loadedAt}
          hasWorkTime={booth.hasWorkTime}
          menu={menu}
        />
      </QueryProvider>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <AppHeader menu={menu} />
      <div><h1>Valet Agents</h1><p>발렛 에이전트 앱이 준비되었습니다.</p></div>
    </div>
  );
}
