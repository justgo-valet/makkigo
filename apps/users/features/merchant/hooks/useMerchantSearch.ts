import { getErrorMessage } from "@makkigo/api-client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { searchMerchants } from "@/features/merchant/apis/searchMerchants";
import { MERCHANT_SEARCH_QUERY_MAX_LENGTH } from "@/libs/merchant/contracts/merchants";

const SEARCH_DEBOUNCE_MS = 300;
const FALLBACK_ERROR_MESSAGE = "업체를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.";

type MerchantSearchView = "idle" | "loading" | "error" | "empty" | "results";

const useMerchantSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(keyword.trim()), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, error, status } = useQuery({
    queryKey: ["merchants", debouncedQuery],
    queryFn: () => searchMerchants(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const getView = (): MerchantSearchView => {
    if (!keyword.trim() || !debouncedQuery) return "idle";
    if (status === "pending") return "loading";
    if (status === "error") return "error";
    return data.length === 0 ? "empty" : "results";
  };

  const changeKeyword = (value: string) =>
    setKeyword(value.slice(0, MERCHANT_SEARCH_QUERY_MAX_LENGTH));

  const reset = () => {
    setKeyword("");
    setDebouncedQuery("");
  };

  return {
    keyword,
    changeKeyword,
    reset,
    view: getView(),
    merchants: data ?? [],
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
  };
};

export { useMerchantSearch };
export type { MerchantSearchView };
