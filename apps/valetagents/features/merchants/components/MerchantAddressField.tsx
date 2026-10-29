"use client";

import { FieldError, cn } from "@makkigo/ui";

import RequiredMark from "./RequiredMark";
import { INPUT_CLASS, LABEL_CLASS } from "../fieldStyles";
import { ADDRESS_DETAIL_MAX_LENGTH } from "../hooks/useMerchantRegistrationForm";

import type { useMerchantAddress } from "../hooks/useMerchantAddress";
import type { RefObject } from "react";

interface MerchantAddressFieldProps {
  address: Omit<ReturnType<typeof useMerchantAddress>, "containerRef" | "triggerRef">;
  containerRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  detail: string;
  disabled: boolean;
  onDetailChange: (value: string) => void;
}

export default function MerchantAddressField({
  address,
  containerRef,
  triggerRef,
  detail,
  disabled,
  onDetailChange,
}: Readonly<MerchantAddressFieldProps>) {
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
        onClick={address.open}
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
        {address.message && <FieldError className="mt-1.5">{address.message}</FieldError>}
        {address.coordinateState === "loading" && (
          <p role="status" className="mt-1.5 text-[13px] text-[#717171]">
            주소 위치를 확인하고 있어요.
          </p>
        )}
        {address.coordinateState === "error" && (
          <div className="mt-1.5 flex items-center gap-2">
            <FieldError>주소 위치를 확인하지 못했어요.</FieldError>
            <button
              type="button"
              className="text-sm text-[#575757] underline"
              onClick={address.retryCoordinates}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {address.layer !== "closed" && (
        <div
          role="dialog"
          aria-modal
          aria-label="주소 검색"
          onKeyDown={(event) => {
            if (event.key === "Escape") address.close();
          }}
          className="fixed inset-0 z-50 flex flex-col bg-white pt-[var(--safe-area-inset-top)] pb-[var(--safe-area-inset-bottom)]"
        >
          <div className="flex h-12 shrink-0 items-center justify-between px-4">
            <p className="text-base font-medium text-(--base-color)">주소 검색</p>
            <button
              type="button"
              autoFocus
              className="h-11 px-2 text-sm text-[#575757] underline"
              onClick={address.close}
            >
              닫기
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div ref={containerRef} className="size-full" />
            {address.layer !== "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-sm text-[#575757]">
                {address.layer === "loading" ? (
                  <p role="status">주소 검색을 불러오고 있어요.</p>
                ) : (
                  <>
                    <p role="alert">주소 검색을 불러오지 못했어요.</p>
                    <button type="button" className="underline" onClick={address.retryLayer}>
                      다시 시도
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
