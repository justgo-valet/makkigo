import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import TicketManagement from "@/features/tickets/components/TicketManagement";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";
import { listOwnTickets } from "@/server/ticket/listOwnTickets";

export default async function TicketsPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  const onboarding = await requireProtectedStaff(staffId);
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);

  const menu = await getStaffMenuAccess(staffId);
  if (!menu) redirect("/login");

  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");

  return (
    <TicketManagement
      imageBaseUrl={imageBaseUrl}
      menu={menu}
      tickets={await listOwnTickets(staffId)}
    />
  );
}
