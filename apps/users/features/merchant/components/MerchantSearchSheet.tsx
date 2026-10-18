"use client";

import { FieldError, Input } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import MerchantDetailView from "@/features/merchant/components/MerchantDetailView";
import { useMerchantSearch } from "@/features/merchant/hooks/useMerchantSearch";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

interface MerchantSearchSheetProps {
  open: boolean;
  detailMerchantId: number | null;
  kakaoMapAppKey: string;
  onClose: () => void;
  onViewMerchant: (merchant: Merchant) => void;
  onBackToList: () => void;
  onChooseMerchant: (merchant: Merchant) => void;
}

const MESSAGES = {
  idle: "업체명이나 지역을 입력해 주세요",
  loading: "검색하고 있어요",
  empty: "검색 결과가 없어요",
} as const;

export default function MerchantSearchSheet({
  open,
  detailMerchantId,
  kakaoMapAppKey,
  onClose,
  onViewMerchant,
  onBackToList,
  onChooseMerchant,
}: Readonly<MerchantSearchSheetProps>) {
  const search = useMerchantSearch();
  const isDetail = detailMerchantId !== null;

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
        className="mx-auto h-[calc(100dvh-180px)] max-w-md gap-0 rounded-t-[20px] border-none px-5 pt-3 pb-[calc(24px+var(--safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
        onCloseAutoFocus={search.reset}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>업체 검색</SheetTitle>
          <SheetDescription>
            발렛을 맡길 업체를 업체명이나 지역으로 찾아 위치와 요금을 확인해요.
          </SheetDescription>
        </SheetHeader>
        <div aria-hidden className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-slate-200" />

        <div
          className={
            isDetail ? "hidden" : "flex min-h-0 flex-1 flex-col animate-in fade-in duration-200"
          }
        >
          <h2 className="shrink-0 text-lg font-bold text-(--base-color)">업체 검색</h2>

          <div className="mt-3.5 mb-3.5 shrink-0">
            <Input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="업체 검색어"
              placeholder="업체명, 지역으로 검색"
              className="h-[42px] border-slate-200 px-3 text-sm placeholder:text-(--tertiary-color) md:text-sm"
              value={search.keyword}
              onChange={(event) => search.changeKeyword(event.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            {search.view === "results" ? (
              <ul className="flex flex-col gap-2">
                {search.merchants.map((merchant) => (
                  <li key={merchant.id}>
                    <button
                      type="button"
                      className="flex min-h-[66px] w-full flex-col justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-xs transition-colors hover:bg-(--surface-color) active:border-(--primary-color) active:bg-[#f4f8fd]"
                      onClick={() => onViewMerchant(merchant)}
                    >
                      <span className="text-sm font-bold break-keep text-(--base-color)">
                        {merchant.name}
                      </span>
                      <span className="text-xs break-keep text-(--tertiary-color)">
                        {merchant.address}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : search.view === "error" ? (
              <FieldError className="py-8 text-center text-sm">{search.errorMessage}</FieldError>
            ) : (
              <output className="block py-8 text-center text-sm text-(--tertiary-color)">
                {MESSAGES[search.view]}
              </output>
            )}
          </div>
        </div>

        {isDetail && (
          <MerchantDetailView
            key={detailMerchantId}
            merchantId={detailMerchantId}
            kakaoMapAppKey={kakaoMapAppKey}
            onBack={onBackToList}
            onClose={onClose}
            onChoose={onChooseMerchant}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
