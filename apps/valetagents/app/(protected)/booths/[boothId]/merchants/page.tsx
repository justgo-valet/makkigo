import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import MerchantManagement from "@/features/booth-merchants/components/MerchantManagement";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { listBoothMerchants } from "@/server/booth/listBoothMerchants";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

interface BoothMerchantsPageProps {
  params: Promise<{ boothId: string }>;
}

export default async function BoothMerchantsPage({ params }: Readonly<BoothMerchantsPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const boothId = Number((await params).boothId);
  if (!Number.isSafeInteger(boothId) || boothId <= 0) notFound();

  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");

  const initialMerchants = await listBoothMerchants(staffId, boothId, 1, imageBaseUrl);
  if (!initialMerchants.ok) notFound();

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  return (
    <QueryProvider sessionKey={staffId}>
      <MerchantManagement
        staffId={staffId}
        boothId={boothId}
        menu={menu}
        initialData={initialMerchants.value}
      />
    </QueryProvider>
  );
}
