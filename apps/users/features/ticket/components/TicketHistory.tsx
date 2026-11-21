"use client";

import { formatTicketNumber, TicketRenderer } from "@makkigo/ticket-design";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@makkigo/ui/components/ui/dialog";

import { useTicketHistory } from "@/features/ticket/hooks/useTicketHistory";
import {
  describeTicketIssue,
  formatIssuedDate,
  NO_MERCHANT_NAME,
} from "@/features/ticket/ticketFormat";

import type { UserTickets } from "@/libs/valet/ticketHistory";

const TICKET_SHADOW = "shadow-[0_2px_12px_rgba(3,9,15,0.18)]";

export default function TicketHistory({
  tickets,
  imageBaseUrl,
}: Readonly<{ tickets: UserTickets; imageBaseUrl: string }>) {
  const { openedTicket, open, close, resolveAssetUrl } = useTicketHistory(imageBaseUrl);
  const { current, past } = tickets;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pt-2 pb-6 [&>*]:shrink-0 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="text-xl font-bold text-(--base-color)">발렛 티켓</h1>

      {!current && past.length === 0 && (
        <p className="flex flex-1 items-center justify-center text-base text-(--tertiary-color)">
          아직 받은 발렛 티켓이 없어요
        </p>
      )}

      {current && (
        <section aria-label="이용 중인 티켓" className="flex flex-col items-center gap-3 px-1">
          {current.ticketNumber !== null && (
            <p className="text-center">
              <span className="block text-sm text-(--tertiary-color)">티켓 번호</span>
              <span className="text-2xl font-bold tabular-nums text-(--base-color)">
                {formatTicketNumber(current.ticketNumber)}
              </span>
            </p>
          )}
          <TicketRenderer
            ariaLabel="이용 중인 발렛 티켓"
            className={`aspect-[3/4] w-full max-w-sm ${TICKET_SHADOW}`}
            design={current.design}
            resolveAssetUrl={resolveAssetUrl}
          />
          {current.merchantName && (
            <p className="text-sm text-(--tertiary-color)">{current.merchantName}</p>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-tickets-title" className="flex flex-col gap-3">
          <h2 id="past-tickets-title" className="text-base font-semibold text-(--base-color)">
            지난 티켓
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
            {past.map((ticket) => (
              <li key={ticket.sessionId}>
                <button
                  type="button"
                  aria-label={`${ticket.merchantName ?? NO_MERCHANT_NAME} ${describeTicketIssue(ticket)} 티켓 크게 보기`}
                  className="flex w-full cursor-pointer flex-col gap-2 text-left"
                  onClick={() => open(ticket)}
                >
                  <TicketRenderer
                    className={`aspect-[3/4] w-full ${TICKET_SHADOW}`}
                    design={ticket.design}
                    resolveAssetUrl={resolveAssetUrl}
                  />
                  <span className="flex flex-col px-0.5">
                    <span className="truncate text-sm font-medium text-(--base-color)">
                      {ticket.merchantName ?? NO_MERCHANT_NAME}
                    </span>
                    <span className="text-xs tabular-nums text-(--tertiary-color)">
                      {formatIssuedDate(ticket.issuedAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={openedTicket !== null} onOpenChange={(isOpen) => !isOpen && close()}>
        {openedTicket && (
          <DialogContent className="max-w-[min(24rem,calc(100%-2rem))] gap-3 rounded-2xl p-5 pt-12 sm:max-w-sm">
            <TicketRenderer
              ariaLabel="발렛 티켓"
              className={`aspect-[3/4] w-full ${TICKET_SHADOW}`}
              design={openedTicket.design}
              resolveAssetUrl={resolveAssetUrl}
            />
            <DialogTitle className="text-center text-base font-semibold text-(--base-color)">
              {openedTicket.merchantName ?? NO_MERCHANT_NAME}
            </DialogTitle>
            <DialogDescription className="-mt-2 text-center text-sm tabular-nums text-(--tertiary-color)">
              {describeTicketIssue(openedTicket)}
            </DialogDescription>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
