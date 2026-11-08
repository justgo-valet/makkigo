"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useQuery } from "@tanstack/react-query";

import { getBoothValetSessions } from "../apis/getBoothValetSessions";
import { getMerchantValetSessions } from "../apis/getMerchantValetSessions";

import type { QueryKey } from "@tanstack/react-query";
import type { BoothValetSessionListResponse, ValetSessionListResponse } from "../schemas/sessions";

const BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS = 5_000;
const LIST_ERROR_MESSAGE = "차량 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

const boothValetSessionsQueryKey = (staffId: number, boothId: number) =>
  ["staff", staffId, "booth-valet-sessions", boothId] as const;

const merchantValetSessionsQueryKey = (staffId: number) =>
  ["staff", staffId, "merchant-valet-sessions"] as const;

const useValetSessionsQuery = <T extends { items: ValetSessionListResponse["items"] }>(
  queryKey: QueryKey,
  queryFn: (signal: AbortSignal) => Promise<T>,
  initialData: T,
  initialDataUpdatedAt: number,
) => {
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    initialData,
    initialDataUpdatedAt,
    retry: false,
    networkMode: "always",
    refetchInterval: BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const data = query.data as T;
  return {
    data,
    lists: {
      sessions: data.items,
      updatedAt: Math.max(query.dataUpdatedAt, query.errorUpdatedAt),
      errorMessage: query.isError ? getErrorMessage(query.error, LIST_ERROR_MESSAGE) : null,
    },
  };
};

interface UseBoothValetSessionsOptions {
  staffId: number;
  boothId: number;
  initialData: BoothValetSessionListResponse;
  initialDataUpdatedAt: number;
}

const useBoothValetSessions = ({
  staffId,
  boothId,
  initialData,
  initialDataUpdatedAt,
}: UseBoothValetSessionsOptions) => {
  const { data, lists } = useValetSessionsQuery(
    boothValetSessionsQueryKey(staffId, boothId),
    (signal) => getBoothValetSessions(boothId, signal),
    initialData,
    initialDataUpdatedAt,
  );

  return {
    ...lists,
    completedCount: data.completedCount,
    notificationsEnabled: data.notificationsEnabled,
  };
};

interface UseMerchantValetSessionsOptions {
  staffId: number;
  initialData: ValetSessionListResponse;
  initialDataUpdatedAt: number;
}

const useMerchantValetSessions = ({
  staffId,
  initialData,
  initialDataUpdatedAt,
}: UseMerchantValetSessionsOptions) => {
  const { data, lists } = useValetSessionsQuery(
    merchantValetSessionsQueryKey(staffId),
    getMerchantValetSessions,
    initialData,
    initialDataUpdatedAt,
  );

  return { ...lists, completed: data.completed };
};

export {
  BOOTH_VALET_SESSIONS_POLL_INTERVAL_MS,
  boothValetSessionsQueryKey,
  useBoothValetSessions,
  useMerchantValetSessions,
};
