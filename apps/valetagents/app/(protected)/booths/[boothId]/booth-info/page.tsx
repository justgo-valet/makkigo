import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import BoothInfoForm from "@/features/booth-info/components/BoothInfoForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { getBoothInfo } from "@/server/booth/boothInfo";
import { getPaymentSettings } from "@/server/booth/paymentSettings";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

interface BoothInfoPageProps {
  params: Promise<{ boothId: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function BoothInfoPage({ params, searchParams }: Readonly<BoothInfoPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const boothId = Number((await params).boothId);
  if (!Number.isSafeInteger(boothId) || boothId <= 0) notFound();

  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");

  const [info, settings] = await Promise.all([
    getBoothInfo(staffId, boothId, imageBaseUrl),
    getPaymentSettings(staffId, boothId),
  ]);
  if (!info.ok || !settings.ok) notFound();

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  return (
    <QueryProvider sessionKey={staffId}>
      <BoothInfoForm
        key={info.value.updatedAt}
        boothId={boothId}
        menu={menu}
        kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""}
        info={info.value}
        feePolicy={settings.value.feePolicy}
        bankAccount={settings.value.bankAccount}
        saved={(await searchParams).saved === "1"}
      />
    </QueryProvider>
  );
}
