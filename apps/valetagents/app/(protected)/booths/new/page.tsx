import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import BoothRegistrationForm from "@/features/onboarding/components/BoothRegistrationForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function NewBoothPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const onboarding = await getStaffOnboardingState(staffId);
  if (!onboarding) redirect("/login");
  if (onboarding.role !== "VALET_AGENT" || onboarding.state === "COMPLETE") {
    redirect(onboarding.nextPath);
  }

  const returnPath = onboarding.state === "AWAITING_APPROVAL" ? "/onboarding?view=search" : "/onboarding";

  return (
    <QueryProvider sessionKey={staffId}>
      <BoothRegistrationForm
        returnPath={returnPath}
        kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""}
      />
    </QueryProvider>
  );
}
