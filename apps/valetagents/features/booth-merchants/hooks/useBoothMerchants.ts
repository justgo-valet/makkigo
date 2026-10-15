"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getBoothMerchants } from "../apis/getBoothMerchants";

import type { BoothMerchantListResponse } from "../schemas/merchants";

const LIST_ERROR_MESSAGE = "업체 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseBoothMerchantsOptions {
  staffId: number;
  boothId: number;
  page: number;
  initialData: BoothMerchantListResponse;
}

const boothMerchantsQueryKey = (staffId: number, boothId: number) =>
  ["staff", staffId, "booth-merchants", boothId] as const;

const useBoothMerchants = ({ staffId, boothId, page, initialData }: UseBoothMerchantsOptions) => {
  const query = useQuery({
    queryKey: [...boothMerchantsQueryKey(staffId, boothId), page],
    queryFn: ({ signal }) => getBoothMerchants(boothId, page, signal),
    initialData: page === initialData.page ? initialData : undefined,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    merchants: query.data?.items ?? [],
    totalPages: query.data?.totalPages ?? 1,
    errorMessage: query.isError ? getErrorMessage(query.error, LIST_ERROR_MESSAGE) : null,
    retry: query.refetch,
  };
};

export { boothMerchantsQueryKey, useBoothMerchants };
