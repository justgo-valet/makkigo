import "server-only";
import { ticketDesignSchema } from "@makkigo/ticket-design";
import { ACTIVE_VALET_SESSION_STATUSES, prisma } from "database";

import type { TicketDesign } from "@makkigo/ticket-design";

const getCurrentTicket = async (userId: number): Promise<TicketDesign | null> => {
  const session = await prisma.valetSession.findFirst({
    where: {
      userId,
      status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { ticketVersion: { select: { design: true } } },
  });
  const design = ticketDesignSchema.safeParse(session?.ticketVersion?.design);
  return design.success ? design.data : null;
};

export { getCurrentTicket };
