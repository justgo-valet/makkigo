"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getBoothAgents } from "../apis/getBoothAgents";

import type { BoothAgentListResponse } from "../schemas/agents";

const LIST_ERROR_MESSAGE = "요원 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseBoothAgentsOptions {
  staffId: number;
  boothId: number;
  page: number;
  initialData: BoothAgentListResponse;
}

const boothAgentsQueryKey = (staffId: number, boothId: number) =>
  ["staff", staffId, "booth-agents", boothId] as const;

const useBoothAgents = ({ staffId, boothId, page, initialData }: UseBoothAgentsOptions) => {
  const query = useQuery({
    queryKey: [...boothAgentsQueryKey(staffId, boothId), page],
    queryFn: ({ signal }) => getBoothAgents(boothId, page, signal),
    initialData: page === initialData.page ? initialData : undefined,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    agents: query.data?.items ?? [],
    totalPages: query.data?.totalPages ?? 1,
    errorMessage: query.isError ? getErrorMessage(query.error, LIST_ERROR_MESSAGE) : null,
    retry: query.refetch,
  };
};

export { boothAgentsQueryKey, useBoothAgents };
