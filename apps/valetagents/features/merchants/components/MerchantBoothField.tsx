"use client";

import { cn } from "@makkigo/ui";

import RequiredMark from "./RequiredMark";
import { INPUT_CLASS, LABEL_CLASS } from "../fieldStyles";

import type { useMerchantBoothField } from "../hooks/useMerchantBoothField";

interface MerchantBoothFieldProps {
  field: ReturnType<typeof useMerchantBoothField>;
  disabled: boolean;
}

const VIEW_MESSAGES = {
  loading: "부스를 검색하고 있어요.",
  empty: "검색된 부스가 없어요.",
  error: "부스를 검색하지 못했어요.",
} as const;

export default function MerchantBoothField({ field, disabled }: Readonly<MerchantBoothFieldProps>) {
  return (
    <div className="relative mt-6" onBlur={field.handleBlur}>
      <label htmlFor="merchant-booth" className={LABEL_CLASS}>
        부스 검색
        <RequiredMark />
      </label>
      <input
        id="merchant-booth"
        type="text"
        role="combobox"
        aria-required
        aria-controls={field.listboxId}
        aria-expanded={field.expanded}
        aria-autocomplete="list"
        aria-activedescendant={field.activeOptionId}
        autoComplete="off"
        inputMode="search"
        enterKeyHint="search"
        disabled={disabled}
        value={field.keyword}
        className={INPUT_CLASS}
        onClick={field.openList}
        onChange={(event) => field.changeKeyword(event.target.value)}
        onKeyDown={field.handleKeyDown}
      />

      {field.expanded && (
        <div
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-[#d8d8d8] bg-white shadow-[2px_-1px_16px_rgba(0,0,0,0.2)]"
          onMouseDown={(event) => event.preventDefault()}
        >
          {field.view === "results" ? (
            <ul
              id={field.listboxId}
              role="listbox"
              aria-label="부스 검색 결과"
              className="max-h-60 overflow-y-auto py-1"
            >
              {field.booths.map((booth, index) => (
                <li
                  key={booth.id}
                  id={field.getOptionId(index)}
                  role="option"
                  aria-selected={field.isActiveOption(index)}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left",
                      field.isActiveOption(index) && "bg-[#f7f9fc]",
                    )}
                    onMouseEnter={() => field.highlightOption(index)}
                    onClick={() => field.select(booth)}
                  >
                    <span className="text-base leading-6 text-(--base-color)">{booth.name}</span>
                    <span className="truncate text-xs leading-5 text-[#717171]">{booth.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div id={field.listboxId} className="px-3 py-3 text-sm text-[#575757]">
              {field.view !== "idle" && (
                <p role={field.view === "error" ? "alert" : "status"}>{VIEW_MESSAGES[field.view]}</p>
              )}
              {field.view === "error" && (
                <button type="button" className="mt-1 underline" onClick={field.retry}>
                  다시 시도
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
