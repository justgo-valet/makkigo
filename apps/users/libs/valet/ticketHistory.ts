import type { TicketDesign } from "@makkigo/ticket-design";

interface UserTicket {
  sessionId: number;
  design: TicketDesign;
  ticketNumber: number | null;
  merchantName: string | null;
  issuedAt: string | null;
}

interface UserTickets {
  current: UserTicket | null;
  past: UserTicket[];
}

export type { UserTicket, UserTickets };
