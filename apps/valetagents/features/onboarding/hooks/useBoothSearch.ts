"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { BOOTH_SEARCH_QUERY_MAX_LENGTH } from "@/libs/booth/contracts/booths";

import { searchBooths } from "../apis/searchBooths";

import type { BoothSearchItem } from "../schemas/onboarding";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_ERROR_MESSAGE = "부스를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.";

type BoothSearchView = "idle" | "loading" | "error" | "empty" | "results";

const boothSearchQueryKey = (staffId: number, query: string) =>
  ["staff", staffId, "booths", query] as const;

const useBoothSearch = (staffId: number, initialKeyword = "") => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialKeyword.trim());

  useEffect(() => {
    const nextQuery = keyword.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(nextQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const query = useQuery({
    queryKey: boothSearchQueryKey(staffId, debouncedQuery),
    queryFn: ({ signal }) => searchBooths(debouncedQuery, signal),
    enabled: debouncedQuery.length > 0,
    retry: false,
  });

  let view: BoothSearchView;
  if (!keyword.trim() || !debouncedQuery) view = "idle";
  else if (keyword.trim() !== debouncedQuery || query.isPending) view = "loading";
  else if (query.isError) view = "error";
  else view = (query.data ?? []).length === 0 ? "empty" : "results";

  const booths: BoothSearchItem[] = view === "results" ? (query.data ?? []) : [];

  return {
    keyword,
    view,
    booths,
    errorMessage: query.error ? getErrorMessage(query.error, SEARCH_ERROR_MESSAGE) : null,
    changeKeyword: (value: string) => setKeyword(value.slice(0, BOOTH_SEARCH_QUERY_MAX_LENGTH)),
    clear: () => {
      setKeyword("");
      setDebouncedQuery("");
    },
    retry: query.refetch,
  };
};

export {
  SEARCH_DEBOUNCE_MS,
  boothSearchQueryKey,
  useBoothSearch,
};
export type { BoothSearchView };
