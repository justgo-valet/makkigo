import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import PaymentSettingsForm from "@/features/payment-settings/components/PaymentSettingsForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { getPaymentSettings } from "@/server/booth/paymentSettings";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

interface PaymentSettingsPageProps {
  params: Promise<{ boothId: string }>;
}

export default async function PaymentSettingsPage({ params }: Readonly<PaymentSettingsPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const boothId = Number((await params).boothId);
  if (!Number.isSafeInteger(boothId) || boothId <= 0) notFound();

  const settings = await getPaymentSettings(staffId, boothId);
  if (!settings.ok) notFound();

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  return (
    <QueryProvider sessionKey={staffId}>
      <PaymentSettingsForm
        boothId={boothId}
        menu={menu}
        feePolicy={settings.value.feePolicy}
        bankAccount={settings.value.bankAccount}
      />
    </QueryProvider>
  );
}
