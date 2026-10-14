"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useQuery } from "@tanstack/react-query";

import { getBoothValetSessions } from "../apis/getBoothValetSessions";

import type { BoothValetSessionListResponse } from "../schemas/sessions";

const BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS = 5_000;
const LIST_ERROR_MESSAGE = "차량 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseBoothValetSessionsOptions {
  staffId: number;
  boothId: number;
  initialData: BoothValetSessionListResponse;
  initialDataUpdatedAt: number;
}

const boothValetSessionsQueryKey = (staffId: number, boothId: number) =>
  ["staff", staffId, "booth-valet-sessions", boothId] as const;

const useBoothValetSessions = ({
  staffId,
  boothId,
  initialData,
  initialDataUpdatedAt,
}: UseBoothValetSessionsOptions) => {
  const query = useQuery({
    queryKey: boothValetSessionsQueryKey(staffId, boothId),
    queryFn: ({ signal }) => getBoothValetSessions(boothId, signal),
    initialData,
    initialDataUpdatedAt,
    retry: false,
    networkMode: "always",
    refetchInterval: BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    sessions: query.data.items,
    completed: query.data.completed,
    updatedAt: Math.max(query.dataUpdatedAt, query.errorUpdatedAt),
    errorMessage: query.isError ? getErrorMessage(query.error, LIST_ERROR_MESSAGE) : null,
  };
};

export { BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS, boothValetSessionsQueryKey, useBoothValetSessions };
