import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import OnboardingShell from "@/features/onboarding/components/OnboardingShell";
import RoleSelection from "@/features/onboarding/RoleSelection";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

interface OnboardingPageProps {
  searchParams: Promise<{ view?: string | string[] }>;
}

export default async function OnboardingPage({ searchParams }: Readonly<OnboardingPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const initialStatus = await getStaffOnboardingState(staffId);
  if (!initialStatus) redirect("/login");
  if (initialStatus.state === "COMPLETE") redirect("/");
  if (initialStatus.state === "ROLE_REQUIRED") return <RoleSelection />;

  const requestedView = (await searchParams).view;
  const initialView = requestedView === "search" ? "search" : null;

  return (
    <QueryProvider sessionKey={staffId}>
      <OnboardingShell
        staffId={staffId}
        initialStatus={initialStatus}
        initialView={initialView}
        kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""}
      />
    </QueryProvider>
  );
}
