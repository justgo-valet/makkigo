import TicketStudio from "@/features/tickets/components/TicketStudio";
import { requireMerchantAdminPage } from "@/server/auth/merchantAdminSession";

import type { TicketDesign } from "@makkigo/ticket-design";

const emptyDesign: TicketDesign = { version: 1, shape: "ROUND_RECT", backgroundColor: "#FFFFFF", layers: [] };

export default async function NewTicketPage() {
  const { merchant } = await requireMerchantAdminPage("/tickets/new");
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  return (
    <TicketStudio
      merchants={[merchant]}
      initialMerchantId={merchant.id}
      initialDesign={emptyDesign}
      imageBaseUrl={imageBaseUrl}
    />
  );
}
