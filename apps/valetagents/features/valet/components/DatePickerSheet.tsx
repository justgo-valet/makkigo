"use client";

import { cn } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import Image from "next/image";
import { useState } from "react";

import { SELECT_ARROW_CLASS } from "@/components/fieldStyles";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const SELECT_CLASS = cn(
  "h-10 rounded-md border border-input bg-white pl-3 text-base font-bold text-(--base-color) outline-none focus-visible:border-primary",
  SELECT_ARROW_CLASS,
);
const MONTH_BUTTON_CLASS = "flex size-10 items-center justify-center rounded-full disabled:opacity-30";

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const pad = (value: number) => String(value).padStart(2, "0");
const toYearMonth = (date: string) => {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
};

interface DatePickerSheetProps {
  open: boolean;
  date: string;
  today: string;
  firstYear: number;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export default function DatePickerSheet({
  open,
  date,
  today,
  firstYear,
  onSelect,
  onClose,
}: Readonly<DatePickerSheetProps>) {
  const [view, setView] = useState(() => toYearMonth(date));
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(toYearMonth(date));
  }

  const last = toYearMonth(today);
  const minYear = Math.min(firstYear, toYearMonth(date).year);
  const show = (year: number, month: number) => {
    const shifted = new Date(Date.UTC(year, month - 1, 1));
    const next = { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
    setView(next.year === last.year && next.month > last.month ? last : next);
  };

  const yearMonth = `${view.year}-${pad(view.month)}`;
  const leadingBlanks = new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const isFirstMonth = view.year <= minYear && view.month === 1;
  const isLastMonth = yearMonth >= today.slice(0, 7);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader title="날짜 선택" />
        <div className="mt-4 flex items-center gap-2 px-5">
          <select
            aria-label="연도"
            value={view.year}
            onChange={(event) => show(Number(event.target.value), view.month)}
            className={SELECT_CLASS}
          >
            {range(minYear, last.year).map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            aria-label="월"
            value={view.month}
            onChange={(event) => show(view.year, Number(event.target.value))}
            className={SELECT_CLASS}
          >
            {range(1, view.year === last.year ? last.month : 12).map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="이전 달"
            disabled={isFirstMonth}
            className={cn(MONTH_BUTTON_CLASS, "ml-auto")}
            onClick={() => show(view.year, view.month - 1)}
          >
            <Image src="/icons/chevron_right.svg" alt="" aria-hidden="true" width={24} height={24} className="rotate-180" />
          </button>
          <button
            type="button"
            aria-label="다음 달"
            disabled={isLastMonth}
            className={MONTH_BUTTON_CLASS}
            onClick={() => show(view.year, view.month + 1)}
          >
            <Image src="/icons/chevron_right.svg" alt="" aria-hidden="true" width={24} height={24} />
          </button>
        </div>

        <div role="grid" aria-label={`${view.year}년 ${view.month}월`} className="mt-3 grid grid-cols-7 gap-y-1 px-5 text-center text-(--base-color)">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} role="columnheader" className="py-1 text-sm text-(--tertiary-color)">
              {weekday}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {range(1, daysInMonth).map((day) => {
            const value = `${yearMonth}-${pad(day)}`;
            const selected = value === date;
            return (
              <button
                key={value}
                type="button"
                role="gridcell"
                aria-label={`${view.month}월 ${day}일`}
                aria-selected={selected}
                disabled={value > today}
                className={cn(
                  "mx-auto flex size-10 items-center justify-center rounded-full text-base tabular-nums disabled:opacity-30",
                  selected ? "bg-primary font-bold text-white" : value === today && "font-bold text-primary",
                )}
                onClick={() => onSelect(value)}
              >
                {day}
              </button>
            );
          })}
        </div>
        <BottomSheetFooter />
      </BottomSheetContent>
    </BottomSheet>
  );
}
