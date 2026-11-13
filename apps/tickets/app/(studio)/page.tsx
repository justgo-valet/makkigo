import { Plus } from "lucide-react";
import Link from "next/link";

import StudioHeader from "@/features/tickets/components/StudioHeader";
import TicketPreview from "@/features/tickets/components/TicketPreview";
import { requireMerchantAdminPage } from "@/server/auth/staffSession";
import { listOwnMerchants, listOwnTickets } from "@/server/ticket/tickets";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export default async function TicketsPage() {
  const staffId = await requireMerchantAdminPage("/");
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const [tickets, merchants] = await Promise.all([listOwnTickets(staffId), listOwnMerchants(staffId)]);

  return (
    <>
      <StudioHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">티켓</h1>
            <p className="mt-1 text-sm text-(--tertiary-color)">고객이 발렛을 맡기면 고객 앱에 이 티켓이 보여요.</p>
          </div>
          {merchants.length > 0 && (
            <Link
              href="/tickets/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" aria-hidden />
              새 티켓
            </Link>
          )}
        </div>

        {merchants.length === 0 ? (
          <p className="mt-16 rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-(--tertiary-color)">
            등록된 업체가 없어요. 요원 앱에서 업체를 먼저 등록해 주세요.
          </p>
        ) : tickets.length === 0 ? (
          <Link
            href="/tickets/new"
            className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-white p-14 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-6" aria-hidden />
            </span>
            <span className="font-semibold">첫 티켓 만들기</span>
            <span className="text-sm text-(--tertiary-color)">글자와 이미지를 올려 업체만의 티켓을 꾸며 보세요.</span>
          </Link>
        ) : (
          <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  aria-label={`${ticket.merchantName} 티켓 ${ticket.id} 편집`}
                  className="group flex flex-col items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(3,9,15,0.04)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(3,9,15,0.08)] hover:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <div className="flex h-60 items-center justify-center">
                    <TicketPreview design={ticket.design} imageBaseUrl={imageBaseUrl} longSide={224} />
                  </div>
                  <div className="w-full">
                    <p className="truncate text-sm font-semibold">{ticket.merchantName}</p>
                    <p className="mt-0.5 text-xs text-(--tertiary-color)">{dateFormat.format(ticket.updatedAt)} 수정</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
