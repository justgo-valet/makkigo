import { Button } from "@makkigo/ui";
import Image from "next/image";
import Link from "next/link";

export default function HomeTicketCard() {
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto w-full justify-start gap-3 rounded-xl p-4 text-left whitespace-normal shadow-none short:gap-2 short:p-3"
    >
      <Link href="/ticket">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 short:size-8">
          <Image src="/icons/ticket.svg" alt="" aria-hidden="true" width={24} height={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span className="text-base font-bold text-(--base-color)">발렛 티켓</span>
          <span className="text-sm font-normal break-keep text-(--tertiary-color) compact:hidden">
            받은 티켓을 바로 봐요
          </span>
        </span>
        <Image src="/icons/chevron_right.svg" alt="" aria-hidden="true" width={16} height={16} />
      </Link>
    </Button>
  );
}
