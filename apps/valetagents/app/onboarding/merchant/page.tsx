import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import MerchantRegistrationForm from "@/features/merchants/components/MerchantRegistrationForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

export default async function MerchantOnboardingPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await getStaffOnboardingState(staffId);
  if (!onboarding) redirect("/login");
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);
  if (onboarding.state === "COMPLETE") redirect("/");

  if (onboarding.state === "MERCHANT_REGISTRATION_REQUIRED") {
    return (
      <QueryProvider sessionKey={staffId}>
        <MerchantRegistrationForm
          staffId={staffId}
          kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""}
          donePath="/onboarding/merchant"
        />
      </QueryProvider>
    );
  }

  return (
    <section>
      <h1>업체 등록</h1>
      <p>업체 승인을 기다리고 있습니다.</p>
    </section>
  );
}
