"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { searchMerchantBooths } from "../apis/searchMerchantBooths";

import type { MerchantBoothSearchItem } from "@/libs/merchant/contracts/merchant-booths";
import type { FocusEvent, KeyboardEvent } from "react";

const SEARCH_DEBOUNCE_MS = 300;
const KEYWORD_MAX_LENGTH = 50;

type MerchantBoothFieldView = "idle" | "loading" | "error" | "empty" | "results";

const useMerchantBoothField = (staffId: number) => {
  const listboxId = useId();
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MerchantBoothSearchItem | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    const nextQuery = keyword.trim();
    const timer = window.setTimeout(() => setQuery(nextQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const search = useQuery({
    queryKey: ["staff", staffId, "merchant-booths", query] as const,
    queryFn: ({ signal }) => searchMerchantBooths(query, signal),
    enabled: query.length > 0 && selected === null,
  });

  let view: MerchantBoothFieldView;
  if (selected !== null || !keyword.trim()) view = "idle";
  else if (keyword.trim() !== query || search.isPending) view = "loading";
  else if (search.isError) view = "error";
  else view = (search.data ?? []).length === 0 ? "empty" : "results";

  const booths = view === "results" ? (search.data ?? []) : [];
  const expanded = open && view !== "idle";
  const activeIndex = booths.length > 0 ? Math.min(highlightedIndex, booths.length - 1) : -1;
  const select = (booth: MerchantBoothSearchItem) => {
    setSelected(booth);
    setKeyword(booth.name);
    setOpen(false);
  };

  return {
    keyword,
    selected,
    view,
    booths,
    expanded,
    listboxId,
    activeOptionId: expanded && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined,
    getOptionId: (index: number) => `${listboxId}-${index}`,
    isActiveOption: (index: number) => index === activeIndex,
    highlightOption: setHighlightedIndex,
    select,
    retry: () => void search.refetch(),
    openList: () => setOpen(true),
    clear: () => {
      setSelected(null);
      setKeyword("");
    },
    changeKeyword: (value: string) => {
      setSelected(null);
      setKeyword(value.slice(0, KEYWORD_MAX_LENGTH));
      setOpen(true);
      setHighlightedIndex(0);
    },
    handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === "Escape") setOpen(false);
      if (!expanded || activeIndex < 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((activeIndex + 1) % booths.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((activeIndex - 1 + booths.length) % booths.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        select(booths[activeIndex]);
      }
    },
    handleBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    },
  };
};

export { useMerchantBoothField };
