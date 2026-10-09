"use client";

import { Button } from "@makkigo/ui";
import Image from "next/image";

import ExitSummaryCard from "@/features/home/components/ExitSummaryCard";
import HomeActionItem from "@/features/home/components/HomeActionItem";
import ValetStatusHeader from "@/features/home/components/ValetStatusHeader";
import { useHome } from "@/features/home/hooks/useHome";
import { useHomeHeader } from "@/features/home/hooks/useHomeHeader";

export default function HomeContent() {
  useHomeHeader();
  const home = useHome();

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pt-4 pb-6 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <ValetStatusHeader title={home.title} badge={home.badge} metaItems={home.metaItems} />

      <div className="relative mx-auto aspect-[16/9] w-full max-w-sm">
        <Image
          src={home.carImageUrl}
          alt={home.carImageAlt}
          fill
          unoptimized
          priority
          className="object-contain"
        />
      </div>

      {home.exitSummary && (
        <ExitSummaryCard
          summary={home.exitSummary}
          isAccountCopied={home.isAccountCopied}
          onCopyAccountNumber={home.copyAccountNumber}
        />
      )}

      <div className="flex flex-col gap-3">
        <Button variant="link" className="h-auto self-start px-0 font-semibold">
          <Image src="/icons/ticket.svg" alt="" aria-hidden="true" width={20} height={20} />
          발렛 티켓 보러가기
        </Button>
        {home.actions.map((action) => (
          <HomeActionItem key={action.key} action={action} />
        ))}
      </div>
    </div>
  );
}
