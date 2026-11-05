import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import MerchantApprovalPending from "@/features/merchants/components/MerchantApprovalPending";
import MerchantRegistrationForm from "@/features/merchants/components/MerchantRegistrationForm";
import { getOnboardingMenu } from "@/libs/auth/menuItems";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { listOwnMerchants } from "@/server/merchant/listOwnMerchants";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

export default async function MerchantOnboardingPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await getStaffOnboardingState(staffId);
  if (!onboarding) redirect("/login");
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);
  if (onboarding.state === "COMPLETE") redirect("/");
  const menu = getOnboardingMenu(staffId, onboarding.role);

  if (onboarding.state === "MERCHANT_REGISTRATION_REQUIRED") {
    return (
      <QueryProvider sessionKey={staffId}>
        <MerchantRegistrationForm
          staffId={staffId}
          menu={menu}
          kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""}
          donePath="/onboarding/merchant"
        />
      </QueryProvider>
    );
  }

  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const { items } = await listOwnMerchants(staffId, imageBaseUrl);

  return (
    <QueryProvider sessionKey={staffId}>
      <MerchantApprovalPending
        staffId={staffId}
        menu={menu}
        merchants={items.map(({ id, name, booths }) => ({ id, name, booths }))}
      />
    </QueryProvider>
  );
}
