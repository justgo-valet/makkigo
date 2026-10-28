"use client";

import { Button, FieldError, FieldLabel, Input } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { useState } from "react";

import {
  MAX_ACTUAL_FEE,
  MAX_EXPECTED_PICKUP_MINUTES,
} from "@/libs/valet/contracts/pickup-response";

import { formatDuration, formatFeeBreakdown, formatPlateNumber, minutesSince } from "../formatters";

import type { BoothValetSession } from "../schemas/sessions";
import type { PickupResponseRequest } from "@/libs/valet/contracts/pickup-response";

const INPUT_CLASS =
  "h-14 flex-1 bg-white text-right text-2xl tabular-nums text-(--base-color) md:text-2xl";

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
      className="flex min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onRespond({ actualFee, expectedPickupMinutes });
      }}
    >
      <BottomSheetHeader title="출차 응답" description="설정한 출차 예상 시간을 차주에게 전달해요" />

      <div className="min-h-0 overflow-y-auto px-5 pt-5">
        <p className="text-center text-2xl font-bold tabular-nums text-(--base-color)">
          {formatPlateNumber(session.plateNumber)}
        </p>
        <p className="mt-2 text-center text-xl font-bold text-(--base-color)">
          <span className="text-primary">
            {requestedMinutes ? formatDuration(requestedMinutes) : "방금"}
          </span>
          {requestedMinutes ? " 전 출차 요청" : " 출차 요청"}
        </p>

        <p className="mt-6 min-h-5 text-sm text-(--tertiary-color)">
          {session.fee && formatFeeBreakdown(session.fee)}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Input
            aria-label="실제 요금"
            inputMode="numeric"
            autoComplete="off"
            value={fee === "" ? "" : actualFee.toLocaleString("ko-KR")}
            onChange={(event) => setFee(toDigits(event.target.value, 8))}
            className={INPUT_CLASS}
          />
          <span className="w-6 text-xl text-(--base-color)">원</span>
        </div>

        <FieldLabel
          htmlFor="pickup-response-minutes"
          className="mt-6 text-sm font-semibold text-(--base-color)"
        >
          예상 출차 시간
        </FieldLabel>
        <div className="mt-2 flex items-center gap-3">
          <Input
            id="pickup-response-minutes"
            inputMode="numeric"
            autoComplete="off"
            value={minutes}
            onChange={(event) => setMinutes(toDigits(event.target.value, 3))}
            className={INPUT_CLASS}
          />
          <span className="w-6 text-xl text-(--base-color)">분</span>
        </div>

        {errorMessage && <FieldError className="mt-3">{errorMessage}</FieldError>}
      </div>

      <BottomSheetFooter className="flex-row pt-6">
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="flex-1 text-(--tertiary-color)"
          onClick={onClose}
        >
          닫기
        </Button>
        <Button
          type="submit"
          size="xl"
          className="flex-1"
          disabled={isResponding || !canRespond}
        >
          응답하기
        </Button>
      </BottomSheetFooter>
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
    <BottomSheet open={session !== null} onClose={form.onClose}>
      <BottomSheetContent>
        {shown && <PickupResponseForm key={shown.id} session={shown} {...form} />}
      </BottomSheetContent>
    </BottomSheet>
  );
}
