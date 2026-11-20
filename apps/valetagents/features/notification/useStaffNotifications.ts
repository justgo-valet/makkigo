"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";

import { apiClient } from "@/libs/common/api/apiClient";
import { staffNotificationsResponseSchema } from "@/libs/notification/contracts/notifications";

const LOAD_ERROR_MESSAGE = "알림을 불러오지 못했어요.";

const fetchStaffNotifications = async (cursor: number | null) =>
  staffNotificationsResponseSchema.parse(
    await apiClient
      .get("staff/me/notifications", { searchParams: cursor === null ? {} : { cursor: String(cursor) } })
      .json(),
  );

const useStaffNotifications = (staffId: number, open: boolean) => {
  const query = useInfiniteQuery({
    queryKey: ["staff", staffId, "notifications"],
    queryFn: ({ pageParam }) => fetchStaffNotifications(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: open,
    staleTime: 0,
  });

  return {
    notifications: query.data?.pages.flatMap((page) => page.notifications) ?? [],
    isLoading: query.isPending && open,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
    errorMessage: query.error ? getErrorMessage(query.error, LOAD_ERROR_MESSAGE) : null,
    retry: () => void query.refetch(),
  };
};

export { useStaffNotifications };
