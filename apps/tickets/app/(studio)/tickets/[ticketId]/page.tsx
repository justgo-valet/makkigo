import { notFound } from "next/navigation";

import TicketStudio from "@/features/tickets/components/TicketStudio";
import { requireMerchantAdminPage } from "@/server/auth/merchantAdminSession";
import { getOwnTicket } from "@/server/ticket/tickets";

export default async function EditTicketPage({ params }: Readonly<{ params: Promise<{ ticketId: string }> }>) {
  const { ticketId: rawTicketId } = await params;
  const { merchant } = await requireMerchantAdminPage(`/tickets/${rawTicketId}`);
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const ticketId = Number(rawTicketId);
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0) notFound();
  const ticket = await getOwnTicket(merchant.id, ticketId);
  if (!ticket) notFound();
  return (
    <TicketStudio
      ticketId={ticket.id}
      merchants={[{ id: ticket.merchantId, name: ticket.merchantName }]}
      initialMerchantId={ticket.merchantId}
      initialDesign={ticket.design}
      imageBaseUrl={imageBaseUrl}
    />
  );
}
