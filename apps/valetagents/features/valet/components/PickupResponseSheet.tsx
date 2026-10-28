"use client";

import { Button, FieldError, Input, Label } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";
import { useState } from "react";

import {
  MAX_ACTUAL_FEE,
  MAX_EXPECTED_PICKUP_MINUTES,
} from "@/libs/valet/contracts/pickup-response";

import { formatDuration, formatFeeBreakdown, formatPlateNumber, minutesSince } from "../formatters";

import type { BoothValetSession } from "../schemas/sessions";
import type { PickupResponseRequest } from "@/libs/valet/contracts/pickup-response";

const INPUT_CLASS =
  "-ml-[7px] h-[58px] w-[288px] rounded-lg border-[#d8d8d8] bg-white pr-6 text-right text-[32px] text-[#03090f] shadow-none md:text-[32px]";

const toDigits = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

interface PickupResponseFormProps {
  session: BoothValetSession;
  now: number;
  isResponding: boolean;
  errorMessage: string | null;
  onRespond: (body: PickupResponseRequest) => void;
  onClose: () => void;
}

function PickupResponseForm({
  session,
  now,
  isResponding,
  errorMessage,
  onRespond,
  onClose,
}: Readonly<PickupResponseFormProps>) {
  const [fee, setFee] = useState(session.fee ? String(session.fee.total) : "");
  const [minutes, setMinutes] = useState("");
  const actualFee = Number(fee);
  const expectedPickupMinutes = Number(minutes);
  const canRespond =
    fee !== "" &&
    actualFee <= MAX_ACTUAL_FEE &&
    expectedPickupMinutes >= 1 &&
    expectedPickupMinutes <= MAX_EXPECTED_PICKUP_MINUTES;
  const requestedMinutes = session.pickupRequestedAt
    ? minutesSince(session.pickupRequestedAt, now)
    : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onRespond({ actualFee, expectedPickupMinutes });
      }}
    >
      <SheetHeader className="gap-4 p-0 text-left">
        <SheetTitle className="text-2xl leading-6 font-medium text-[#03090f]">출차 응답</SheetTitle>
        <SheetDescription className="text-sm leading-6 text-[#717171]">
          설정한 출차 예상 시간을 차주에게 전달해요
        </SheetDescription>
      </SheetHeader>

      <p className="mt-3 pl-[11px] text-center text-[28px] leading-8 font-bold text-[#03090f]">
        {formatPlateNumber(session.plateNumber)}
      </p>
      <p className="mt-[15px] pl-[11px] text-center text-[32px] leading-10 font-bold text-[#03090f]">
        <span className="text-(--secondary-color)">
          {requestedMinutes ? formatDuration(requestedMinutes) : "방금"}
        </span>
        {requestedMinutes ? " 전 출차 요청" : " 출차 요청"}
      </p>

      <p className="-ml-1 mt-[33px] min-h-6 text-sm leading-6 text-[#717171]">
        {session.fee && formatFeeBreakdown(session.fee)}
      </p>
      <div className="mt-[7px] flex items-center">
        <Input
          aria-label="실제 요금"
          inputMode="numeric"
          autoComplete="off"
          value={fee === "" ? "" : actualFee.toLocaleString("ko-KR")}
          onChange={(event) => setFee(toDigits(event.target.value, 8))}
          className={INPUT_CLASS}
        />
        <span className="ml-[33px] text-2xl text-[#03090f]">원</span>
      </div>

      <Label
        htmlFor="pickup-response-minutes"
        className="mt-6 text-xl leading-6 font-medium text-[#03090f]"
      >
        예상 출차 시간
      </Label>
      <div className="mt-[14px] flex items-center">
        <Input
          id="pickup-response-minutes"
          inputMode="numeric"
          autoComplete="off"
          value={minutes}
          onChange={(event) => setMinutes(toDigits(event.target.value, 3))}
          className={INPUT_CLASS}
        />
        <span className="ml-[33px] text-2xl text-[#03090f]">분</span>
      </div>

      {errorMessage && <FieldError className="mt-3">{errorMessage}</FieldError>}

      <div className="mt-[53px] ml-[3px] flex gap-[5px]">
        <Button
          type="button"
          className="h-[75px] flex-1 rounded-[6px] bg-(--secondary-color) text-lg font-medium hover:bg-(--secondary-color)"
          onClick={onClose}
        >
          닫기
        </Button>
        <Button
          type="submit"
          className="h-[75px] flex-1 rounded-[6px] text-lg font-medium"
          disabled={isResponding || !canRespond}
        >
          응답하기
        </Button>
      </div>
    </form>
  );
}

interface PickupResponseSheetProps extends Omit<PickupResponseFormProps, "session"> {
  session: BoothValetSession | null;
}

export default function PickupResponseSheet({
  session,
  ...form
}: Readonly<PickupResponseSheetProps>) {
  const [shown, setShown] = useState(session);
  if (session && session !== shown) setShown(session);

  return (
    <Sheet open={session !== null} onOpenChange={(open) => !open && form.onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className="mx-auto max-w-[767px] gap-0 rounded-t-[32px] border border-[#d8d8d8] bg-[#f7f9fc] pt-[33px] pr-[23px] pb-[max(24px,var(--safe-area-inset-bottom))] pl-[21px] shadow-[0_-3px_4px_rgba(0,0,0,0.25)] data-[state=closed]:duration-150 data-[state=open]:duration-200"
      >
        {shown && <PickupResponseForm key={shown.id} session={shown} {...form} />}
      </SheetContent>
    </Sheet>
  );
}
