import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { listOwnMerchants } from "@/server/merchant/listOwnMerchants";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function MerchantsPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await requireProtectedStaff(staffId);
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);

  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const merchants = await listOwnMerchants(staffId, imageBaseUrl);

  return (
    <section>
      <h1>업체 목록</h1>
      <ul>
        {merchants.items.map((merchant) => (
          <li key={merchant.id}>{merchant.name}</li>
        ))}
      </ul>
    </section>
  );
}
