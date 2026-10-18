"use client";

import { Button, FieldError } from "@makkigo/ui";
import Image from "next/image";
import Link from "next/link";

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
import ArrivalDelaySheet from "@/features/valet/components/ArrivalDelaySheet";
import BankTransferSheet from "@/features/valet/components/BankTransferSheet";
import LocationConsentSheet from "@/features/valet/components/LocationConsentSheet";
import PickupRequestSheets from "@/features/valet/components/PickupRequestSheets";
import ValetNoticeSheet from "@/features/valet/components/ValetNoticeSheet";
import { useArrivalDelayFlow } from "@/features/valet/hooks/useArrivalDelayFlow";
import { useCancelArrivalFlow } from "@/features/valet/hooks/useCancelArrivalFlow";
import { usePickupRequestFlow } from "@/features/valet/hooks/usePickupRequestFlow";

import type { HomeActionKey } from "@/features/home/homeActions";

export default function HomeContent({ kakaoMapAppKey }: Readonly<{ kakaoMapAppKey: string }>) {
  useHomeHeader();
  const home = useHome();
  const merchantSearch = useMerchantSearchFlow();
  const pushPermissionBanner = usePushPermissionBanner();
  const pickupRequest = usePickupRequestFlow();
  const cancelArrival = useCancelArrivalFlow();
  const arrivalDelay = useArrivalDelayFlow({ onStartArrival: merchantSearch.startArrival });
  const actionHandlers: Partial<Record<HomeActionKey, () => void>> = {
    EXIT_REQUEST: pickupRequest.open,
    CANCEL_ARRIVAL: cancelArrival.open,
    ARRIVAL: merchantSearch.startArrival,
    MERCHANT_SEARCH: merchantSearch.open,
    DELAY: arrivalDelay.open,
  };

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
          transfer={home.bankTransfer}
          onFeeDetailClick={pickupRequest.openFeeDetail}
        />
      )}

      <div className="flex flex-col gap-3">
        {home.hasTicket && (
          <Button asChild variant="link" className="h-auto self-start px-0 font-semibold">
            <Link href="/ticket">
              <Image src="/icons/ticket.svg" alt="" aria-hidden="true" width={20} height={20} />
              발렛 티켓 보러가기
            </Link>
          </Button>
        )}
        {home.actions.map((action) => (
          <HomeActionItem key={action.key} action={action} onClick={actionHandlers[action.key]} />
        ))}
      </div>

      <MerchantSearchSheet
        open={merchantSearch.isSearchOpen}
        detailMerchantId={merchantSearch.detailMerchantId}
        kakaoMapAppKey={kakaoMapAppKey}
        onClose={merchantSearch.close}
        onViewMerchant={merchantSearch.viewMerchant}
        onBackToList={merchantSearch.backToList}
        onChooseMerchant={merchantSearch.chooseMerchant}
      />
      <ValetNoticeSheet
        open={merchantSearch.isMerchantRequiredOpen}
        title="업체가 선택되지 않았어요"
        description="업체 검색을 하시겠어요?"
        confirmLabel="업체 검색하기"
        closeLabel="나중에 할게요"
        onConfirm={merchantSearch.open}
        onClose={merchantSearch.close}
      />
      <ArrivalConfirmSheet
        open={merchantSearch.isArrivalOpen}
        merchantName={merchantSearch.pickedMerchant?.name ?? null}
        isSending={merchantSearch.isSending}
        errorMessage={merchantSearch.sendErrorMessage}
        onSend={merchantSearch.sendArrival}
        onClose={merchantSearch.close}
      />
      <LocationConsentSheet
        open={merchantSearch.isLocationConsentOpen}
        isSending={merchantSearch.isSending}
        errorMessage={merchantSearch.sendErrorMessage}
        onAgreeAndSend={merchantSearch.agreeLocationAndSend}
        onSendWithoutLocation={merchantSearch.sendWithoutLocation}
        onClose={merchantSearch.close}
      />
      <PickupRequestSheets flow={pickupRequest} />
      <BankTransferSheet transfer={home.bankTransfer} />
      <ValetNoticeSheet
        open={cancelArrival.isOpen}
        title="도착 알림을 취소할까요?"
        description="도착 알림을 받은 발렛 요원님께 취소했다고 알려요"
        confirmLabel="도착 알림 취소하기"
        pendingLabel="취소하는 중…"
        closeLabel="닫기"
        isPending={cancelArrival.isCancelling}
        errorMessage={cancelArrival.errorMessage}
        onConfirm={cancelArrival.confirm}
        onClose={cancelArrival.close}
      />
      <ValetNoticeSheet
        open={arrivalDelay.isArrivalRequiredOpen}
        title="도착 알림을 먼저 해주세요"
        description="도착 알림을 보낸 뒤에 지연 알림을 보낼 수 있어요"
        confirmLabel="도착 알림 하러 가기"
        closeLabel="닫기"
        onConfirm={arrivalDelay.startArrival}
        onClose={arrivalDelay.close}
      />
      <ArrivalDelaySheet
        open={arrivalDelay.isSelectOpen}
        expectedArrivalTime={arrivalDelay.expectedArrivalTime}
        options={arrivalDelay.options}
        selectedMinutes={arrivalDelay.selectedMinutes}
        isSending={arrivalDelay.isSending}
        errorMessage={arrivalDelay.errorMessage}
        onSelect={arrivalDelay.select}
        onSend={arrivalDelay.send}
        onClose={arrivalDelay.close}
      />
      <ValetNoticeSheet
        open={arrivalDelay.isSentOpen}
        title="지연 알림을 보냈어요"
        description={`요원님께 ${arrivalDelay.sentDelayText ?? ""} 늦어진다고 알렸어요`}
        confirmLabel="확인"
        onConfirm={arrivalDelay.close}
        onClose={arrivalDelay.close}
      />
    </div>
  );
}
