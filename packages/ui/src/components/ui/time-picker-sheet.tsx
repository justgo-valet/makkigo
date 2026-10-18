"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./sheet";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const HOURS = Array.from({ length: 24 }, (_, index) => index);

type TimeParts = Readonly<{ hour: number; minute: number }>;

export interface TimePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  minuteStep?: number;
}

export const validateMinuteStep = (minuteStep: number) => {
  if (!Number.isInteger(minuteStep) || minuteStep <= 0 || 60 % minuteStep !== 0) {
    throw new Error("minuteStep must be a positive integer divisor of 60.");
  }
};

export const parseTimePickerValue = (value: string | null, minuteStep: number): TimeParts => {
  validateMinuteStep(minuteStep);

  const normalizedValue = value ?? "00:00";
  if (!TIME_PATTERN.test(normalizedValue)) {
    throw new Error(`Invalid time picker value: ${normalizedValue}`);
  }

  const [hour, minute] = normalizedValue.split(":").map(Number);
  if (minute % minuteStep !== 0) {
    throw new Error(`Time picker value must align with minuteStep: ${normalizedValue}`);
  }

  return { hour, minute };
};

const formatTimePickerValue = ({ hour, minute }: TimeParts) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

interface TimeColumnProps {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
}

const ROW_HEIGHT = 54;
const SCROLL_SETTLE_MS = 100;
const DRAG_THRESHOLD_PX = 4;

interface ColumnDrag {
  pointerId: number;
  startY: number;
  startScrollTop: number;
  moved: boolean;
}

function TimeColumn({ label, options, value, onChange }: TimeColumnProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const optionRefs = React.useRef(new Map<number, HTMLButtonElement>());
  const scrollTimerRef = React.useRef<number | undefined>(undefined);
  const mountedRef = React.useRef(false);
  const dragRef = React.useRef<ColumnDrag | null>(null);
  const suppressClickRef = React.useRef(false);
  const selectedIndex = options.indexOf(value);

  React.useLayoutEffect(() => {
    listRef.current?.scrollTo({
      top: selectedIndex * ROW_HEIGHT,
      behavior: mountedRef.current ? "smooth" : "auto",
    });
    mountedRef.current = true;
  }, [selectedIndex]);

  React.useEffect(() => () => window.clearTimeout(scrollTimerRef.current), []);

  // 스크롤이 멈춘 뒤 가운데 줄에 온 값을 고른다.
  const handleScroll = () => {
    window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      const list = listRef.current;
      if (!list || dragRef.current?.moved) return;

      const index = Math.round(list.scrollTop / ROW_HEIGHT);
      const centered = options[Math.min(options.length - 1, Math.max(0, index))];
      if (centered !== value) onChange(centered);
    }, SCROLL_SETTLE_MS);
  };

  // 터치는 브라우저 스크롤로 굴러가지만 마우스는 끌어도 굴러가지 않아 직접 굴린다.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    suppressClickRef.current = false;
    if (event.pointerType === "touch" || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: event.currentTarget.scrollTop,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const list = event.currentTarget;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(distance) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      list.setPointerCapture(event.pointerId);
      // 끄는 동안에는 줄에 달라붙지 않고 손을 따라오게 한다.
      list.style.scrollSnapType = "none";
    }
    list.scrollTop = drag.startScrollTop - distance;
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const list = event.currentTarget;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (!drag.moved) return;

    // 끌다 놓은 자리에서 눌림으로 처리되지 않게 하고, 가장 가까운 줄로 맞춘다.
    suppressClickRef.current = true;
    list.style.scrollSnapType = "";
    const index = Math.min(options.length - 1, Math.max(0, Math.round(list.scrollTop / ROW_HEIGHT)));
    list.scrollTo({ top: index * ROW_HEIGHT, behavior: "smooth" });
    if (options[index] !== value) onChange(options[index]);
  };

  const selectAndFocus = (nextValue: number) => {
    onChange(nextValue);
    optionRefs.current.get(nextValue)?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, option: number) => {
    const index = options.indexOf(option);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (index + 1) % options.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = (index - 1 + options.length) % options.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectAndFocus(options[nextIndex]);
  };

  return (
    <div
      aria-label={label}
      className="relative h-full w-22 cursor-grab snap-y snap-mandatory overflow-y-auto py-[54px] select-none [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.stopPropagation();
      }}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onScroll={handleScroll}
      ref={listRef}
      role="listbox"
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            aria-selected={selected}
            className={cn(
              "flex h-[54px] w-full snap-center items-center justify-center rounded-2xl text-[40px] leading-none tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-black" : "text-[rgba(113,113,113,0.75)]",
            )}
            key={option}
            onClick={() => onChange(option)}
            onKeyDown={(event) => handleKeyDown(event, option)}
            ref={(element) => {
              if (element) optionRefs.current.set(option, element);
              else optionRefs.current.delete(option);
            }}
            role="option"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {String(option).padStart(2, "0")}
          </button>
        );
      })}
    </div>
  );
}

export function TimePickerSheet({
  open,
  onOpenChange,
  value,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  minuteStep = 1,
}: TimePickerSheetProps) {
  const initialValue = parseTimePickerValue(value, minuteStep);
  const [draft, setDraft] = React.useState<TimeParts>(initialValue);
  const previousOpenRef = React.useRef(open);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const minutes = React.useMemo(
    () => Array.from({ length: 60 / minuteStep }, (_, index) => index * minuteStep),
    [minuteStep],
  );

  React.useLayoutEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;

    if (open && !wasOpen) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDraft(parseTimePickerValue(value, minuteStep));
    }
  }, [minuteStep, open, value]);

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const target = returnFocusRef.current;
    returnFocusRef.current = null;

    if (target?.isConnected && !target.hasAttribute("disabled")) {
      target.focus();
    }
  };

  const confirm = () => {
    onConfirm(formatTimePickerValue(draft));
    onOpenChange(false);
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="mx-auto max-w-[767px] gap-0 rounded-t-[32px] border border-[#d8d8d8] bg-[#f7f9fc] px-[27px] pt-[39px] pb-[max(19px,var(--safe-area-inset-bottom))] shadow-[0_-3px_4px_rgba(0,0,0,0.25)] data-[state=closed]:duration-150 data-[state=open]:duration-200"
        onCloseAutoFocus={restoreFocus}
        overlayClassName="bg-transparent"
        showCloseButton={false}
        side="bottom"
      >
        <SheetHeader className="gap-[9px] p-0 text-left">
          <SheetTitle className="text-2xl leading-6 font-medium text-[#03090f]">{title}</SheetTitle>
          <SheetDescription
            className={description ? "text-sm leading-6 text-[#717171]" : "sr-only"}
          >
            {description ?? "시간과 분을 선택한 뒤 확인을 누르세요."}
          </SheetDescription>
        </SheetHeader>

        <div
          className="relative mt-[18px] flex h-[162px] justify-center gap-[52px]"
          data-slot="time-picker-columns"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[54px] h-[54px] rounded-2xl bg-[rgba(129,169,218,0.2)]"
          />
          <TimeColumn
            label="시간"
            onChange={(hour) => setDraft((current) => ({ ...current, hour }))}
            options={HOURS}
            value={draft.hour}
          />
          <TimeColumn
            label="분"
            onChange={(minute) => setDraft((current) => ({ ...current, minute }))}
            options={minutes}
            value={draft.minute}
          />
        </div>

        <Button
          className="mt-[21px] h-14 w-full rounded-[6px] text-lg font-medium"
          onClick={confirm}
          type="button"
        >
          {confirmLabel}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
