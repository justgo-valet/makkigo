import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import TicketEditor from "@/features/tickets/components/TicketEditor";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";
import { getOwnTicketForEdit } from "@/server/ticket/saveTicket";

export default async function EditTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required to edit tickets");
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  const onboarding = await requireProtectedStaff(staffId);
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);
  const ticketId = Number((await params).ticketId);
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0) notFound();
  const [menu, ticket] = await Promise.all([getStaffMenuAccess(staffId), getOwnTicketForEdit(staffId, ticketId)]);
  if (!menu) redirect("/login");
  if (!ticket) notFound();
  return (
    <TicketEditor
      ticketId={ticket.id}
      initialMerchantId={ticket.merchantId}
      merchants={[]}
      initialDesign={ticket.design}
      imageBaseUrl={imageBaseUrl}
      menu={menu}
    />
  );
}
