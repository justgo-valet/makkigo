import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import CompletedHistory from "@/features/valet/components/CompletedHistory";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";
import { listCompletedValetSessions } from "@/server/valet/listCompletedValetSessions";
import { parseSeoulDate, toSeoulDate } from "@/server/valet/seoulDay";

interface BoothHistoryPageProps {
  params: Promise<{ boothId: string }>;
  searchParams: Promise<{ date?: string | string[]; merchant?: string | string[] }>;
}

export default async function BoothHistoryPage({
  params,
  searchParams,
}: Readonly<BoothHistoryPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  await requireProtectedStaff(staffId);

  const rawBoothId = (await params).boothId;
  if (!/^[1-9]\d*$/.test(rawBoothId)) notFound();
  const boothId = Number(rawBoothId);
  if (!Number.isSafeInteger(boothId)) notFound();

  const query = await searchParams;
  const merchant = typeof query.merchant === "string" ? query.merchant : undefined;
  const now = new Date();
  const date = parseSeoulDate(query.date, now);
  if (!date) {
    const fallback = new URLSearchParams({ date: toSeoulDate(now) });
    if (merchant) fallback.set("merchant", merchant);
    redirect(`/booths/${boothId}/history?${fallback}`);
  }

  const history = await listCompletedValetSessions(staffId, boothId, date, now);
  if (!history.ok) notFound();

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  return (
    <QueryProvider sessionKey={staffId}>
      <CompletedHistory
        boothId={boothId}
        menu={menu}
        history={history.value}
        merchant={merchant}
      />
    </QueryProvider>
  );
}
