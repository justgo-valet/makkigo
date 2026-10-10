"use client";

import { cn } from "@makkigo/ui";

import OnboardingLinks from "./OnboardingLinks";
import { useBoothCombobox } from "../hooks/useBoothCombobox";

import type { BoothSearchItem } from "../schemas/onboarding";
import type { ReactNode } from "react";

interface BoothSearchProps {
  staffId: number;
  initialKeyword: string;
  canReturnToPending: boolean;
  onShowPending: () => void;
  onKeywordChange: () => void;
  onSelect: (booth: BoothSearchItem) => void;
  children: ReactNode;
}

const VIEW_MESSAGES = {
  idle: "검색된 부스가 없어요.",
  loading: "부스를 검색하고 있어요.",
  empty: "검색된 부스가 없어요.",
} as const;

const ICON_PROPS = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
} as const;

export default function BoothSearch({
  staffId,
  initialKeyword,
  canReturnToPending,
  onShowPending,
  onKeywordChange,
  onSelect,
  children,
}: Readonly<BoothSearchProps>) {
  const { inputRef, ...combobox } = useBoothCombobox({
    staffId,
    initialKeyword,
    onKeywordChange,
    onSelect,
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative z-10 h-14" onBlur={combobox.handleBlur}>
        <div
          className={cn(
            "absolute inset-x-0 top-0 overflow-hidden rounded-3xl border border-[#d8d8d8] bg-white",
            combobox.expanded && "shadow-[2px_-1px_16px_rgba(0,0,0,0.2)]",
          )}
        >
          <div className="flex h-[54px] items-center pr-[15px] pl-[21px]">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="부스 검색어"
              aria-controls={combobox.listboxId}
              aria-expanded={combobox.expanded}
              aria-autocomplete="list"
              aria-activedescendant={combobox.activeOptionId}
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
              placeholder="발렛 부스 검색하기"
              value={combobox.keyword}
              className="h-full min-w-0 flex-1 bg-transparent text-lg font-medium text-(--base-color) outline-none placeholder:text-base placeholder:font-normal placeholder:text-[#7d7d7d]"
              onClick={combobox.openList}
              onChange={(event) => combobox.changeKeyword(event.target.value)}
              onKeyDown={combobox.handleKeyDown}
            />
            {combobox.keyword ? (
              <button
                type="button"
                aria-label="검색어 지우기"
                className="shrink-0 text-(--base-color)"
                onClick={combobox.clear}
              >
                <svg {...ICON_PROPS} className="size-6">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            ) : (
              <svg {...ICON_PROPS} className="mr-1.5 size-6 shrink-0 text-[#575757]">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m20 20-4.5-4.5" />
              </svg>
            )}
          </div>

          {combobox.expanded && (
            <ul
              id={combobox.listboxId}
              role="listbox"
              aria-label="부스 검색 결과"
              className="max-h-[min(60dvh,420px)] overflow-y-auto pb-[17px]"
            >
              {combobox.booths.map((booth, index) => (
                <li
                  key={booth.id}
                  id={combobox.getOptionId(index)}
                  role="option"
                  aria-selected={combobox.isActiveOption(index)}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex h-9 w-full items-start justify-between gap-3 pr-[15px] pl-[21px] text-left leading-6",
                      combobox.isHighlightedOption(index) && "bg-[#f7f9fc]",
                    )}
                    onMouseEnter={() => combobox.highlightOption(index)}
                    onClick={() => combobox.select(booth)}
                  >
                    <span className="shrink-0 text-lg text-(--base-color)">{booth.name}</span>
                    <span className="min-w-0 truncate pt-px text-xs leading-6 text-[#717171]">
                      {booth.address}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {children ?? (
        <>
          <div
            className="mt-[72px] text-center text-lg text-[#575757]"
            aria-live="polite"
            aria-busy={combobox.view === "loading"}
          >
            {combobox.view === "error" ? (
              <>
                <p role="alert">{combobox.errorMessage}</p>
                <button type="button" className="mt-3 text-base underline" onClick={combobox.retry}>
                  다시 시도
                </button>
              </>
            ) : (
              combobox.view !== "results" && <p role="status">{VIEW_MESSAGES[combobox.view]}</p>
            )}
          </div>
          <OnboardingLinks
            canReturnToPending={canReturnToPending}
            onShowPending={onShowPending}
            className="mt-auto flex-col gap-3 pt-8 pb-[25px] text-xl"
          />
        </>
      )}
    </div>
  );
}
