import { redirect } from "next/navigation";

import TicketStudio from "@/features/tickets/components/TicketStudio";
import { requireMerchantAdminPage } from "@/server/auth/staffSession";
import { listOwnMerchants } from "@/server/ticket/tickets";

import type { TicketDesign } from "@makkigo/ticket-design";

const emptyDesign: TicketDesign = { version: 1, shape: "ROUND_RECT", backgroundColor: "#FFFFFF", layers: [] };

export default async function NewTicketPage() {
  const staffId = await requireMerchantAdminPage("/tickets/new");
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const merchants = await listOwnMerchants(staffId);
  if (merchants.length === 0) redirect("/");
  return (
    <TicketStudio
      merchants={merchants}
      initialMerchantId={merchants[0].id}
      initialDesign={emptyDesign}
      imageBaseUrl={imageBaseUrl}
    />
  );
}
