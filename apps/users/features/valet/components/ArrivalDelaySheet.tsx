"use client";

import { Button, cn, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { MinusIcon, PlusIcon } from "lucide-react";

import type {
  ArrivalDelayOption,
  ArrivalDelayStepper,
} from "@/features/valet/hooks/useArrivalDelayFlow";

interface ArrivalDelaySheetProps {
  open: boolean;
  expectedArrivalTime: string | null;
  options: ArrivalDelayOption[];
  selectedOptionMinutes: number | null;
  stepper: ArrivalDelayStepper | null;
  maxMinutes: number;
  isSending: boolean;
  errorMessage: string | null;
  onSelect: (minutes: number) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onSend: () => void;
  onClose: () => void;
}

export default function ArrivalDelaySheet({
  open,
  expectedArrivalTime,
  options,
  selectedOptionMinutes,
  stepper,
  maxMinutes,
  isSending,
  errorMessage,
  onSelect,
  onDecrease,
  onIncrease,
  onSend,
  onClose,
}: Readonly<ArrivalDelaySheetProps>) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader
          title="도착이 늦어지시나요?"
          description={
            expectedArrivalTime
              ? `요청하신 ${expectedArrivalTime}보다 얼마나 더 걸릴지 알려주세요`
              : "도착이 얼마나 더 걸릴지 알려주세요"
          }
        />
        <fieldset className="grid grid-cols-3 gap-2 px-5 pt-5">
          <legend className="sr-only">지연 시간</legend>
          {options.map((option) => {
            const isSelected = option.minutes === selectedOptionMinutes;

            return (
              <Button
                key={option.minutes}
                type="button"
                aria-pressed={isSelected}
                variant="outline"
                onClick={() => onSelect(option.minutes)}
                className={cn(
                  "h-12 w-full rounded-xl text-base font-bold shadow-none",
                  isSelected &&
                    "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                )}
              >
                {option.label}
              </Button>
            );
          })}
        </fieldset>
        {stepper && (
          <div className="flex items-center justify-center gap-6 px-5 pt-5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="5분 줄이기"
              disabled={!stepper.canDecrease}
              onClick={onDecrease}
              className="size-12 rounded-full shadow-none"
            >
              <MinusIcon className="size-5" />
            </Button>
            <output aria-live="polite" className="w-20 text-center text-2xl font-bold">
              {stepper.minutes}분
            </output>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="5분 늘리기"
              disabled={!stepper.canIncrease}
              onClick={onIncrease}
              className="size-12 rounded-full shadow-none"
            >
              <PlusIcon className="size-5" />
            </Button>
          </div>
        )}
        {stepper && !stepper.canIncrease && (
          <p className="px-5 pt-3 text-center text-sm break-keep text-(--tertiary-color)">
            {maxMinutes}분보다 늦어지면 도착 알림을 취소하고 출발할 때 다시 보내주세요
          </p>
        )}
        {errorMessage && <FieldError className="px-5 pt-3">{errorMessage}</FieldError>}
        <BottomSheetFooter className="pt-5">
          <Button
            type="button"
            size="xl"
            className="w-full"
            disabled={selectedOptionMinutes === null || isSending}
            onClick={onSend}
          >
            지연 알림 보내기
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className="w-full text-(--tertiary-color)"
            onClick={onClose}
          >
            취소
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
