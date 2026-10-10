"use client";

import { Button, FieldError, Input } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import { useMerchantSearch } from "@/features/merchant/hooks/useMerchantSearch";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

interface MerchantSearchSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (merchant: Merchant) => void;
}

const MESSAGES = {
  idle: "업체명이나 지역을 입력해 주세요",
  loading: "검색하고 있어요",
  empty: "검색 결과가 없어요",
} as const;

export default function MerchantSearchSheet({
  open,
  onClose,
  onSelect,
}: Readonly<MerchantSearchSheetProps>) {
  const search = useMerchantSearch();

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
        className="mx-auto h-[78dvh] max-w-md gap-0 rounded-t-2xl"
        onCloseAutoFocus={search.reset}
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="px-5 pt-4 pb-4">
          <SheetTitle className="text-lg font-bold text-(--base-color)">업체 검색</SheetTitle>
          <SheetDescription className="sr-only">
            발렛을 맡길 업체를 업체명이나 지역으로 찾아요.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5">
          <Input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            aria-label="업체 검색어"
            placeholder="업체명, 지역으로 검색"
            className="h-[42px]"
            value={search.keyword}
            onChange={(event) => search.changeKeyword(event.target.value)}
          />
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-6">
          {search.view === "results" ? (
            <ul className="flex flex-col gap-2">
              {search.merchants.map((merchant) => (
                <li key={merchant.id}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3.5 py-3.5 text-left whitespace-normal"
                    onClick={() => onSelect(merchant)}
                  >
                    <span className="text-sm font-bold text-(--base-color)">{merchant.name}</span>
                    <span className="text-xs font-normal text-(--tertiary-color)">
                      {merchant.address}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : search.view === "error" ? (
            <FieldError className="py-8 text-center">{search.errorMessage}</FieldError>
          ) : (
            <output className="block py-8 text-center text-sm text-(--tertiary-color)">
              {MESSAGES[search.view]}
            </output>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
