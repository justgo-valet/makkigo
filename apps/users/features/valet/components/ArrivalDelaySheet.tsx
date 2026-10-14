"use client";

import { Button, cn, FieldError } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import type {
  ArrivalDelayMinutes,
  ArrivalDelayOption,
} from "@/features/valet/hooks/useArrivalDelayFlow";

interface ArrivalDelaySheetProps {
  open: boolean;
  expectedArrivalTime: string | null;
  options: ArrivalDelayOption[];
  selectedMinutes: ArrivalDelayMinutes | null;
  isSending: boolean;
  errorMessage: string | null;
  onSelect: (minutes: ArrivalDelayMinutes) => void;
  onSend: () => void;
  onClose: () => void;
}

export default function ArrivalDelaySheet({
  open,
  expectedArrivalTime,
  options,
  selectedMinutes,
  isSending,
  errorMessage,
  onSelect,
  onSend,
  onClose,
}: Readonly<ArrivalDelaySheetProps>) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-2xl"
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="gap-2 px-5 pt-4">
          <SheetTitle className="text-lg font-bold break-keep text-(--base-color)">
            도착이 늦어지시나요?
          </SheetTitle>
          <SheetDescription className="text-sm break-keep text-(--tertiary-color)">
            {expectedArrivalTime
              ? `요청하신 ${expectedArrivalTime}보다 얼마나 더 걸릴지 알려주세요`
              : "도착이 얼마나 더 걸릴지 알려주세요"}
          </SheetDescription>
        </SheetHeader>
        <fieldset className="grid grid-cols-3 gap-2 px-5 pt-5">
          <legend className="sr-only">지연 시간</legend>
          {options.map((option) => {
            const isSelected = option.minutes === selectedMinutes;

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
        {errorMessage && <FieldError className="px-5 pt-3">{errorMessage}</FieldError>}
        <SheetFooter className="px-5 pt-5 pb-6">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={selectedMinutes === null || isSending}
            onClick={onSend}
          >
            지연 알림 보내기
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full text-(--tertiary-color)"
            onClick={onClose}
          >
            취소
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
