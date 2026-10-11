import { getErrorMessage } from "@makkigo/api-client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { getNotifications } from "@/features/notification/apis/getNotifications";
import { readAllNotifications } from "@/features/notification/apis/readAllNotifications";
import { NOTIFICATION_APPEARANCES } from "@/features/notification/notificationAppearance";
import { formatNotificationTime } from "@/features/notification/notificationFormat";

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
const FALLBACK_ERROR_MESSAGE = "알림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

type NotificationSheetView = "loading" | "error" | "empty" | "list";

const useNotificationSheet = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const hasRequestedReadRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    data,
    dataUpdatedAt,
    error,
    status,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isOpen,
    retry: false,
  });

  const { mutate: markAllRead } = useMutation({ mutationFn: readAllNotifications });

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];
  const hasUnread = notifications.some((notification) => notification.readAt === null);

  useEffect(() => {
    if (!isOpen || status !== "success" || hasRequestedReadRef.current) return;

    hasRequestedReadRef.current = true;
    if (hasUnread) markAllRead();
  }, [isOpen, status, hasUnread, markAllRead]);

  const open = () => setIsOpen(true);

  const close = () => {
    setIsOpen(false);
    hasRequestedReadRef.current = false;
    queryClient.removeQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  };

  const loadMoreRef = useCallback(
    (element: HTMLElement | null) => {
      observerRef.current?.disconnect();
      if (!element || !hasNextPage) return;

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      });
      observerRef.current.observe(element);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const getView = (): NotificationSheetView => {
    if (status === "pending") return "loading";
    if (status === "error") return "error";
    return notifications.length === 0 ? "empty" : "list";
  };

  return {
    isOpen,
    open,
    close,
    view: getView(),
    items: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      isUnread: notification.readAt === null,
      timeLabel: formatNotificationTime(notification.createdAt, dataUpdatedAt),
      icon: NOTIFICATION_APPEARANCES[notification.type].icon,
      tone: NOTIFICATION_APPEARANCES[notification.type].tone,
    })),
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
    retry: () => void refetch(),
  };
};

type NotificationListItem = ReturnType<typeof useNotificationSheet>["items"][number];

export { useNotificationSheet };
export type { NotificationListItem, NotificationSheetView };
