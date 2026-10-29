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
            "absolute inset-x-0 top-0 overflow-hidden rounded-lg border border-input bg-white shadow-xs",
            combobox.expanded && "shadow-lg",
          )}
        >
          <div className="flex h-13.5 items-center px-4">
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
              className="h-full min-w-0 flex-1 bg-transparent text-lg font-medium text-(--base-color) outline-none placeholder:text-base placeholder:font-normal placeholder:text-(--tertiary-color)"
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
              <svg {...ICON_PROPS} className="mr-1.5 size-6 shrink-0 text-(--tertiary-color)">
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
              className="max-h-[min(60dvh,420px)] overflow-y-auto pb-4"
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
                      "flex h-10 w-full items-center justify-between gap-3 px-4 text-left",
                      combobox.isHighlightedOption(index) && "bg-(--surface-color)",
                    )}
                    onMouseEnter={() => combobox.highlightOption(index)}
                    onClick={() => combobox.select(booth)}
                  >
                    <span className="shrink-0 text-base text-(--base-color)">{booth.name}</span>
                    <span className="min-w-0 truncate text-xs text-(--tertiary-color)">
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
            className="mt-18 text-center text-base text-(--tertiary-color)"
            aria-live="polite"
            aria-busy={combobox.view === "loading"}
          >
            {combobox.view === "error" ? (
              <>
                <p role="alert">{combobox.errorMessage}</p>
                <button type="button" className="mt-3 text-sm underline" onClick={combobox.retry}>
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
            className="mt-auto flex-col gap-3 pt-8 pb-6 text-base"
          />
        </>
      )}
    </div>
  );
}
