"use client";

import BankTransferSheet from "@/features/valet/components/BankTransferSheet";
import PickupAcceptedContent from "@/features/valet/components/PickupAcceptedContent";
import ValetFeeBreakdown from "@/features/valet/components/ValetFeeBreakdown";
import ValetSheet from "@/features/valet/components/ValetSheet";

import type { PickupRequestFlow } from "@/features/valet/hooks/usePickupRequestFlow";

interface PickupRequestSheetsProps {
  flow: PickupRequestFlow;
}

export default function PickupRequestSheets({ flow }: Readonly<PickupRequestSheetsProps>) {
  return (
    <>
      <ValetSheet
        open={flow.isNoSessionOpen}
        title="도착 알림 없이 바로 요원님께 맡기셨나요?"
        description="요원님께서 주차 중입니다. 주차가 끝나면 출차 요청을 할 수 있어요."
        onConfirm={flow.close}
        onClose={flow.close}
      />
      <ValetSheet
        open={flow.isNotParkedOpen}
        title="아직 주차 완료되지 않은 차량입니다"
        description="요원님이 주차를 마치면 출차 요청을 할 수 있어요."
        onConfirm={flow.close}
        onClose={flow.close}
      />
      <ValetSheet
        open={flow.isFeeOpen}
        title="발렛 요금 계산 내역"
        description={flow.feeDescription}
        confirmLabel={flow.isRequesting ? "요청하는 중…" : "확인"}
        isConfirmDisabled={flow.isRequesting}
        errorMessage={flow.errorMessage}
        onConfirm={flow.confirmFee}
        onClose={flow.close}
      >
        {flow.fee ? (
          <ValetFeeBreakdown fee={flow.fee} />
        ) : (
          <p className="rounded-xl bg-(--surface-color) px-4 py-4 text-sm break-keep text-(--tertiary-color)">
            이 부스는 요금 기준표가 없어 요원님이 요금을 안내해요.
          </p>
        )}
      </ValetSheet>
      <ValetSheet
        open={flow.isAcceptedOpen}
        title="출차 요청이 접수되었어요"
        onConfirm={flow.close}
        onClose={flow.close}
      >
        <PickupAcceptedContent
          pickupTimeLabel={flow.pickupTimeLabel}
          fee={flow.fee}
          isFeeExpanded={flow.isFeeExpanded}
          accountLabel={flow.accountLabel}
          transfer={flow.bankTransfer}
          onToggleFee={flow.toggleFee}
        />
      </ValetSheet>
      <BankTransferSheet transfer={flow.bankTransfer} />
    </>
  );
}
