"use client";

import { Button, FieldError } from "@makkigo/ui";
import Image from "next/image";

import ExitSummaryCard from "@/features/home/components/ExitSummaryCard";
import HomeActionItem from "@/features/home/components/HomeActionItem";
import ValetStatusHeader from "@/features/home/components/ValetStatusHeader";
import { useHome } from "@/features/home/hooks/useHome";
import { useHomeHeader } from "@/features/home/hooks/useHomeHeader";
import ArrivalConfirmSheet from "@/features/merchant/components/ArrivalConfirmSheet";
import MerchantSearchSheet from "@/features/merchant/components/MerchantSearchSheet";
import { useMerchantSearchFlow } from "@/features/merchant/hooks/useMerchantSearchFlow";
import PushPermissionBanner from "@/features/push/components/PushPermissionBanner";
import { usePushPermissionBanner } from "@/features/push/hooks/usePushPermissionBanner";

export default function HomeContent() {
  useHomeHeader();
  const home = useHome();
  const merchantSearch = useMerchantSearchFlow();
  const pushPermissionBanner = usePushPermissionBanner();

  if (home.status === "loading") return null;

  if (home.status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <FieldError>{home.errorMessage}</FieldError>
        <Button variant="outline" onClick={home.retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pt-4 pb-6 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {pushPermissionBanner.isVisible && (
        <PushPermissionBanner onOpenSettings={pushPermissionBanner.openSettings} />
      )}
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
          <HomeActionItem
            key={action.key}
            action={action}
            onClick={action.key === "MERCHANT_SEARCH" ? merchantSearch.open : undefined}
          />
        ))}
      </div>

      <MerchantSearchSheet
        open={merchantSearch.isSearchOpen}
        onClose={merchantSearch.close}
        onSelect={merchantSearch.pickMerchant}
      />
      <ArrivalConfirmSheet
        open={merchantSearch.isArrivalOpen}
        merchantName={merchantSearch.pickedMerchant?.name ?? null}
        onSend={merchantSearch.sendArrival}
        onClose={merchantSearch.close}
      />
    </div>
  );
}
