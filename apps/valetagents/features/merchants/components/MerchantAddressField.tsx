"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { useState } from "react";

import RequiredMark from "./RequiredMark";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/fieldStyles";
import { ADDRESS_DETAIL_MAX_LENGTH } from "../hooks/useMerchantRegistrationForm";

import type { AddressSearchResult, useMerchantAddress } from "../hooks/useMerchantAddress";
import type { RefObject } from "react";

type MerchantAddress = Omit<ReturnType<typeof useMerchantAddress>, "triggerRef">;

interface AddressSearchResultsProps {
  search: MerchantAddress["search"];
  onSelect: (result: AddressSearchResult) => void;
  onRetry: () => void;
}

function AddressSearchResults({ search, onSelect, onRetry }: Readonly<AddressSearchResultsProps>) {
  const notice = "py-10 text-center text-sm text-(--tertiary-color)";
  if (search.status === "idle") {
    return <p className={notice}>도로명이나 지번 주소로 검색해 주세요.</p>;
  }
  if (search.status === "searching") {
    return <p role="status" className={notice}>주소를 찾고 있어요.</p>;
  }
  if (search.status === "error") {
    return (
      <div className={cn(notice, "flex flex-col items-center gap-1")}>
        <p role="alert">주소를 찾지 못했어요.</p>
        <button type="button" className="underline" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }
  if (search.results.length === 0) {
    return <p className={notice}>검색 결과가 없어요. 도로명과 건물 번호를 함께 입력해 보세요.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {search.results.map((result, index) => (
        <li key={`${index}-${result.roadAddress}`}>
          <button
            type="button"
            className="flex w-full flex-col items-start gap-0.5 py-3 text-left"
            onClick={() => onSelect(result)}
          >
            {result.placeName && (
              <span className="text-sm font-semibold text-primary">{result.placeName}</span>
            )}
            <span className="text-base font-medium text-(--base-color)">{result.roadAddress}</span>
            <span className="text-sm text-(--tertiary-color)">
              [{result.postalCode}] {result.lotAddress ?? ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

interface MerchantAddressFieldProps {
  address: MerchantAddress;
  triggerRef: RefObject<HTMLButtonElement | null>;
  detail: string;
  disabled: boolean;
  onDetailChange: (value: string) => void;
}

export default function MerchantAddressField({
  address,
  triggerRef,
  detail,
  disabled,
  onDetailChange,
}: Readonly<MerchantAddressFieldProps>) {
  const [query, setQuery] = useState("");

  return (
    <>
      <p id="merchant-address-label" className={cn(LABEL_CLASS, "mt-6")}>
        업체 주소
        <RequiredMark />
      </p>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby="merchant-address-label merchant-address-value"
        aria-haspopup="dialog"
        disabled={disabled}
        className={cn(INPUT_CLASS, "text-left")}
        onClick={() => {
          setQuery("");
          address.open();
        }}
      >
        <span id="merchant-address-value" className="block truncate">
          {address.selection?.roadAddress}
        </span>
      </button>
      <input
        type="text"
        aria-label="상세 주소"
        autoComplete="off"
        maxLength={ADDRESS_DETAIL_MAX_LENGTH}
        placeholder="상세 주소를 입력해 주세요"
        disabled={disabled}
        value={detail}
        className={INPUT_CLASS}
        onChange={(event) => onDetailChange(event.target.value)}
      />

      <div aria-live="polite">
        {address.coordinateState === "loading" && (
          <p role="status" className="mt-1.5 text-xs text-(--tertiary-color)">
            주소 위치를 확인하고 있어요.
          </p>
        )}
        {address.coordinateState === "error" && (
          <div className="mt-1.5 flex items-center gap-2">
            <FieldError>주소 위치를 확인하지 못했어요.</FieldError>
            <button
              type="button"
              className="text-sm text-(--tertiary-color) underline"
              onClick={address.retryCoordinates}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {address.isSearchOpen && (
        <div
          role="dialog"
          aria-modal
          aria-label="주소 검색"
          onKeyDown={(event) => {
            if (event.key === "Escape") address.close();
          }}
          className="fixed inset-0 z-50 flex flex-col bg-white pt-(--safe-area-inset-top) pb-(--safe-area-inset-bottom)"
        >
          <div className="flex h-12 shrink-0 items-center justify-between px-4">
            <p className="text-base font-medium text-(--base-color)">주소 검색</p>
            <button
              type="button"
              className="h-11 px-2 text-sm text-(--tertiary-color) underline"
              onClick={address.close}
            >
              닫기
            </button>
          </div>
          <div role="search" className="flex shrink-0 gap-2 px-4">
            <input
              type="search"
              enterKeyHint="search"
              aria-label="주소"
              autoComplete="off"
              autoFocus
              placeholder="도로명, 건물 번호, 지번 (예: 세종대로 110)"
              value={query}
              className={cn(INPUT_CLASS, "mt-0 min-w-0 flex-1")}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (!event.nativeEvent.isComposing) address.searchAddresses(query);
              }}
            />
            <Button
              type="button"
              className="h-12 shrink-0 px-4 shadow-none"
              disabled={!query.trim() || address.search.status === "searching"}
              onClick={() => address.searchAddresses(query)}
            >
              검색
            </Button>
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <AddressSearchResults
              search={address.search}
              onSelect={address.select}
              onRetry={() => address.searchAddresses(query)}
            />
          </div>
        </div>
      )}
    </>
  );
}
