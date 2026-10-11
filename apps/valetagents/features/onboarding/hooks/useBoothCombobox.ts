"use client";

import { useId, useRef, useState } from "react";

import { useBoothSearch } from "./useBoothSearch";

import type { BoothSearchItem } from "../schemas/onboarding";
import type { FocusEvent, KeyboardEvent } from "react";

interface UseBoothComboboxOptions {
  staffId: number;
  initialKeyword: string;
  onKeywordChange: () => void;
  onSelect: (booth: BoothSearchItem) => void;
}

// 위 · 아래 방향키는 목록 끝에서 반대쪽 끝으로 넘어간다.
const getNextActiveIndex = (key: "ArrowDown" | "ArrowUp", current: number, count: number) => {
  if (key === "ArrowDown") return (current + 1) % count;
  return current <= 0 ? count - 1 : current - 1;
};

const useBoothCombobox = ({
  staffId,
  initialKeyword,
  onKeywordChange,
  onSelect,
}: UseBoothComboboxOptions) => {
  const search = useBoothSearch(staffId, initialKeyword);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const expanded = open && search.view === "results";
  // 아무것도 가리키지 않았으면 Enter 가 첫 결과를 고르도록 첫 항목을 활성으로 본다.
  const activeIndex = expanded
    ? Math.min(Math.max(highlightedIndex, 0), search.booths.length - 1)
    : -1;

  const select = (booth: BoothSearchItem) => {
    setOpen(false);
    inputRef.current?.blur();
    onSelect(booth);
  };

  return {
    keyword: search.keyword,
    view: search.view,
    booths: search.booths,
    errorMessage: search.errorMessage,
    retry: () => void search.retry(),
    listboxId,
    inputRef,
    expanded,
    activeOptionId: activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined,
    getOptionId: (index: number) => `${listboxId}-${index}`,
    isActiveOption: (index: number) => activeIndex === index,
    isHighlightedOption: (index: number) => highlightedIndex === index,
    highlightOption: setHighlightedIndex,
    select,
    openList: () => setOpen(true),
    changeKeyword: (value: string) => {
      setOpen(true);
      setHighlightedIndex(-1);
      search.changeKeyword(value);
      onKeywordChange();
    },
    clear: () => {
      search.clear();
      onKeywordChange();
    },
    handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") setOpen(false);
      if (!expanded) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex(getNextActiveIndex(event.key, activeIndex, search.booths.length));
      } else if (event.key === "Enter") {
        event.preventDefault();
        select(search.booths[activeIndex]);
      }
    },
    // 검색 영역 밖으로 포커스가 나가면 목록을 닫는다.
    handleBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    },
  };
};

export { getNextActiveIndex, useBoothCombobox };
