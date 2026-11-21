import { formatTicketNumber } from "@makkigo/ticket-design";

import type { UserTicket } from "@/libs/valet/ticketHistory";

const NO_MERCHANT_NAME = "업체 정보 없음";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatIssuedDate = (issuedAt: string | null) => {
  if (!issuedAt) return null;
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(issuedAt)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day}`;
};

const describeTicketIssue = (ticket: UserTicket) =>
  [
    formatIssuedDate(ticket.issuedAt),
    ticket.ticketNumber === null ? null : `티켓 ${formatTicketNumber(ticket.ticketNumber)}`,
  ]
    .filter(Boolean)
    .join(" · ");

export { describeTicketIssue, formatIssuedDate, NO_MERCHANT_NAME };
