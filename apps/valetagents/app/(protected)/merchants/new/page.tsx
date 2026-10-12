import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import MerchantRegistrationForm from "@/features/merchants/components/MerchantRegistrationForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function NewMerchantPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await requireProtectedStaff(staffId);
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);

  return (
    <QueryProvider sessionKey={staffId}>
      <MerchantRegistrationForm
        staffId={staffId}
        kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""}
        donePath="/merchants"
        returnPath="/merchants"
      />
    </QueryProvider>
  );
}
