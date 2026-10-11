import "server-only";
import { prisma } from "database";

import { NOTIFICATIONS_PAGE_SIZE } from "@/libs/notification/contracts/notifications";

import type { NotificationsResponse } from "@/libs/notification/contracts/notifications";

const getNotifications = async (
  userId: number,
  cursor: number | null,
): Promise<NotificationsResponse> => {
  const rows = await prisma.notification.findMany({
    where: { userId, ...(cursor ? { id: { lt: cursor } } : {}) },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      valetSessionId: true,
      readAt: true,
      createdAt: true,
    },
    orderBy: { id: "desc" },
    take: NOTIFICATIONS_PAGE_SIZE + 1,
  });

  const page = rows.slice(0, NOTIFICATIONS_PAGE_SIZE);

  return {
    notifications: page.map((row) => ({
      ...row,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > NOTIFICATIONS_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  };
};

export { getNotifications };
