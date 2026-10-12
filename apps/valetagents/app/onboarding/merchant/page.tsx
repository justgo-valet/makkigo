import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  return (
    <section>
      <h1>업체 등록</h1>
      <p>
        {onboarding.state === "MERCHANT_APPROVAL_PENDING"
          ? "업체 승인을 기다리고 있습니다."
          : "업체 정보를 등록해 주세요."}
      </p>
    </section>
  );
}
