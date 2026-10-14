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
}

const boothValetSessionsQueryKey = (staffId: number, boothId: number) =>
  ["staff", staffId, "booth-valet-sessions", boothId] as const;

const useBoothValetSessions = ({ staffId, boothId, initialData }: UseBoothValetSessionsOptions) => {
  const query = useQuery({
    queryKey: boothValetSessionsQueryKey(staffId, boothId),
    queryFn: ({ signal }) => getBoothValetSessions(boothId, signal),
    initialData,
    retry: false,
    refetchInterval: BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    sessions: query.data.items,
    errorMessage: query.isError ? getErrorMessage(query.error, LIST_ERROR_MESSAGE) : null,
    retry: query.refetch,
  };
};

export { BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS, boothValetSessionsQueryKey, useBoothValetSessions };
