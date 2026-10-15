import "server-only";

import { ticketDesignSchema } from "@makkigo/ticket-design";
import { prisma } from "database";

import type { TicketListResponse } from "@/libs/ticket/contracts/tickets";

const listOwnTickets = async (staffId: number): Promise<TicketListResponse> => {
  const tickets = await prisma.ticket.findMany({
    where: {
      deletedAt: null,
      merchant: { adminId: staffId, deletedAt: null },
    },
    select: {
      id: true,
      versions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { id: true, design: true, createdAt: true },
      },
    },
  });

  return {
    items: tickets
      .flatMap((ticket) => {
        const version = ticket.versions[0];
        if (!version) return [];
        const design = ticketDesignSchema.safeParse(version.design);
        return design.success ? [{ id: ticket.id, design: design.data, version }] : [];
      })
      .sort(
        (left, right) =>
          right.version.createdAt.getTime() - left.version.createdAt.getTime() ||
          right.version.id - left.version.id ||
          right.id - left.id,
      )
      .map(({ id, design }) => ({ id, design })),
  };
};

export { listOwnTickets };
