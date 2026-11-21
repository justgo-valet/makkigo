import "server-only";
import { ticketDesignSchema } from "@makkigo/ticket-design";
import { ACTIVE_VALET_SESSION_STATUSES, prisma } from "database";

import type { UserTicket, UserTickets } from "@/libs/valet/ticketHistory";
import type { Prisma } from "database";

const PAST_TICKET_LIMIT = 60;

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  parkedAt: true,
  merchant: { select: { name: true } },
  ticketVersion: { select: { design: true } },
} satisfies Prisma.ValetSessionSelect;

type TicketSession = Prisma.ValetSessionGetPayload<{ select: typeof TICKET_SELECT }>;

const toUserTicket = (session: TicketSession | null): UserTicket | null => {
  const design = ticketDesignSchema.safeParse(session?.ticketVersion?.design);
  if (!session || !design.success) return null;
  return {
    sessionId: session.id,
    design: design.data,
    ticketNumber: session.ticketNumber,
    merchantName: session.merchant?.name ?? null,
    issuedAt: session.parkedAt?.toISOString() ?? null,
  };
};

const getTickets = async (userId: number): Promise<UserTickets> => {
  const [currentSession, pastSessions] = await Promise.all([
    prisma.valetSession.findFirst({
      where: { userId, status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: TICKET_SELECT,
    }),
    prisma.valetSession.findMany({
      where: { userId, status: "COMPLETED", ticketVersionId: { not: null } },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: PAST_TICKET_LIMIT,
      select: TICKET_SELECT,
    }),
  ]);
  return {
    current: toUserTicket(currentSession),
    past: pastSessions.flatMap((session) => toUserTicket(session) ?? []),
  };
};

export { getTickets };
