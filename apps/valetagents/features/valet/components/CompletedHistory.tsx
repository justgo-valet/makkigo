"use client";

import { cn } from "@makkigo/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";
import { INPUT_CLASS, SELECT_ARROW_CLASS } from "@/components/fieldStyles";

import {
  formatClock,
  formatHistoryDate,
  formatPlateNumber,
  formatWon,
} from "../formatters";
import { useUpdateCompletedFee } from "../hooks/useUpdateCompletedFee";

import DatePickerSheet from "./DatePickerSheet";
import FeeEditSheet from "./FeeEditSheet";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { CompletedHistory as CompletedHistoryData, CompletedHistoryItem } from "@/libs/valet/contracts/completed-history";

const ALL_MERCHANTS = "all";
const NO_MERCHANT = "none";

const normalizeMerchant = (value: string | undefined, history: CompletedHistoryData) =>
  value && (value === NO_MERCHANT || history.merchants.some(({ id }) => String(id) === value))
    ? value
    : ALL_MERCHANTS;

interface CompletedHistoryProps {
  boothId: number;
  menu: MenuAccess;
  history: CompletedHistoryData;
  merchant?: string;
}

const merchantKey = (item: CompletedHistoryItem) =>
  item.merchant ? String(item.merchant.id) : NO_MERCHANT;

const historyHref = (boothId: number, date: string, merchant: string) => {
  const params = new URLSearchParams({ date });
  if (merchant !== ALL_MERCHANTS) params.set("merchant", merchant);
  return `/booths/${boothId}/history?${params}`;
};


export default function CompletedHistory({
  boothId,
  menu,
  history,
  merchant: requestedMerchant,
}: Readonly<CompletedHistoryProps>) {
  const merchant = normalizeMerchant(requestedMerchant, history);
  const router = useRouter();
  const [feeTarget, setFeeTarget] = useState<CompletedHistoryItem | null>(null);
  const feeEditing = useUpdateCompletedFee({
    boothId,
    onUpdated: () => {
      setFeeTarget(null);
      router.refresh();
    },
  });

  const items =
    merchant === ALL_MERCHANTS
      ? history.items
      : history.items.filter((item) => merchantKey(item) === merchant);
  const total = items.reduce((sum, { fee }) => sum + (fee ?? 0), 0);
  const missingFeeCount = items.filter(({ fee }) => fee === null).length;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col pb-6">
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">집계</h1>

      <button
        type="button"
        aria-label={`${formatHistoryDate(history.date)}, 날짜 선택`}
        className="mt-4 flex h-12 items-center justify-center gap-1 self-center rounded-full px-4 text-lg font-bold text-(--base-color) focus-visible:outline-2 focus-visible:outline-primary"
        onClick={() => setPickerOpen(true)}
      >
        {formatHistoryDate(history.date)}
        <Image src="/icons/chevron_right.svg" alt="" aria-hidden="true" width={20} height={20} className="rotate-90" />
      </button>

      <select
        aria-label="업체"
        value={merchant}
        onChange={(event) => router.replace(historyHref(boothId, history.date, event.target.value))}
        className={cn(INPUT_CLASS, SELECT_ARROW_CLASS)}
      >
        <option value={ALL_MERCHANTS}>업체 전체</option>
        {history.merchants.map(({ id, name }) => (
          <option key={id} value={String(id)}>
            {name}
          </option>
        ))}
        <option value={NO_MERCHANT}>업체 없음</option>
      </select>

      <section
        aria-label="합계"
        className="mt-3 flex items-baseline justify-between rounded-2xl bg-white px-4 py-3 text-(--base-color)"
      >
        <span className="text-base font-medium">
          합계 <span className="font-bold tabular-nums">{items.length}대</span>
        </span>
        <span className="text-right">
          <span className="block text-lg font-bold tabular-nums">{formatWon(total)}</span>
          {missingFeeCount > 0 && (
            <span className="block text-sm text-(--tertiary-color)">금액 미입력 {missingFeeCount}대</span>
          )}
        </span>
      </section>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-(--tertiary-color)">출차 완료된 차량이 없어요.</p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl bg-white text-(--base-color)">
          {items.map((item) => (
            <li key={item.id} className="border-b last:border-b-0">
              <button
                type="button"
                aria-label={`${formatPlateNumber(item.plateNumber)} 발렛 금액 수정`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                onClick={() => {
                  feeEditing.resetError();
                  setFeeTarget(item);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold tabular-nums">
                    {formatPlateNumber(item.plateNumber)}
                  </span>
                  <span className="block truncate text-sm text-(--tertiary-color)">
                    {item.merchant?.name ?? "업체 없음"} · {item.parkedAt ? `${formatClock(item.parkedAt)} 주차` : "주차 시각 없음"} ·{" "}
                    {formatClock(item.completedAt)} 출차
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-base tabular-nums",
                    item.fee === null ? "text-(--tertiary-color)" : "font-bold",
                  )}
                >
                  {item.fee === null ? "금액 미입력" : formatWon(item.fee)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DatePickerSheet
        open={pickerOpen}
        date={history.date}
        today={history.today}
        firstYear={history.firstYear}
        onSelect={(date) => {
          setPickerOpen(false);
          router.push(historyHref(boothId, date, merchant));
        }}
        onClose={() => setPickerOpen(false)}
      />
      <FeeEditSheet
        session={feeTarget}
        isUpdating={feeEditing.isUpdating}
        errorMessage={feeEditing.errorMessage}
        onSave={(fee) => feeTarget && feeEditing.update(feeTarget.id, fee)}
        onClose={() => !feeEditing.isUpdating && setFeeTarget(null)}
      />
    </div>
  );
}
