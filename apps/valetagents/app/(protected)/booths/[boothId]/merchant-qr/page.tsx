import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import MerchantQrCodes from "@/features/merchant-qr/MerchantQrCodes";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { listMerchantQrCodes } from "@/server/merchant/listMerchantQrCodes";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

const parsePositiveId = (value: string | string[] | undefined) => {
  if (typeof value !== "string" || !/^[1-9]\d{0,8}$/.test(value)) return null;
  return Number(value);
};

interface MerchantQrPageProps {
  params: Promise<{ boothId: string }>;
  searchParams: Promise<{ merchant?: string | string[] }>;
}

export default async function MerchantQrPage({ params, searchParams }: Readonly<MerchantQrPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const boothId = parsePositiveId((await params).boothId);
  if (!boothId) notFound();
  const merchantId = parsePositiveId((await searchParams).merchant);

  const [qrCodes, menu] = await Promise.all([
    listMerchantQrCodes(staffId, boothId),
    getStaffMenuAccess(staffId),
  ]);
  if (!menu) redirect("/login");
  if (!qrCodes.ok) notFound();

  return <MerchantQrCodes menu={menu} qrCodes={qrCodes.value} initialMerchantId={merchantId} />;
}
