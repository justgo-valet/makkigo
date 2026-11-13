import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import MerchantQrCodes from "@/features/merchants/components/MerchantQrCodes";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { listMerchantQrCodes } from "@/server/merchant/listMerchantQrCodes";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function MerchantQrPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await requireProtectedStaff(staffId);
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);

  const usersPublicUrl = process.env.USERS_PUBLIC_URL;
  if (!usersPublicUrl) throw new Error("USERS_PUBLIC_URL is required");

  const [menu, qrCodes] = await Promise.all([
    getStaffMenuAccess(staffId),
    listMerchantQrCodes(staffId, usersPublicUrl),
  ]);
  if (!menu) redirect("/login");

  return <MerchantQrCodes menu={menu} qrCodes={qrCodes} />;
}
