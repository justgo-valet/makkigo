import "server-only";

import { prisma } from "database";

import { STAFF_NOTIFICATIONS_PAGE_SIZE } from "@/libs/notification/contracts/notifications";

import type { StaffNotificationsResponse } from "@/libs/notification/contracts/notifications";

export const listStaffNotifications = async (
  staffId: number,
  cursor: number | null,
): Promise<StaffNotificationsResponse> => {
  const rows = await prisma.notification.findMany({
    where: { staffId, ...(cursor ? { id: { lt: cursor } } : {}) },
    select: { id: true, type: true, title: true, body: true, createdAt: true },
    orderBy: { id: "desc" },
    take: STAFF_NOTIFICATIONS_PAGE_SIZE + 1,
  });
  const page = rows.slice(0, STAFF_NOTIFICATIONS_PAGE_SIZE);

  return {
    notifications: page.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    nextCursor: rows.length > STAFF_NOTIFICATIONS_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  };
};
