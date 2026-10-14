import { apiClient } from "@/libs/common/api/apiClient";
import { notificationsResponseSchema } from "@/libs/notification/contracts/notifications";

import type { NotificationsResponse } from "@/libs/notification/contracts/notifications";

const getNotifications = async (cursor: number | null): Promise<NotificationsResponse> => {
  const response = await apiClient
    .get("notifications", { searchParams: cursor ? { cursor } : {} })
    .json<unknown>();

  const parsedResponse = notificationsResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("유효하지 않은 응답입니다.");
  }
  return parsedResponse.data;
};

export { getNotifications };
