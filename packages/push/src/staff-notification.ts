import { prisma } from "database";

import { sendPushToTokens } from "./fcm";

interface StaffPushGroup {
  title: string;
  body: string;
  notificationIdByToken: Map<string, number>;
}

const findPushTargets = (notificationIds: number[]) =>
  prisma.notification.findMany({
    where: {
      id: { in: notificationIds },
      channel: null,
      staff: {
        deletedAt: null,
        boothMemberships: { some: { status: "APPROVED", notificationsEnabled: true } },
      },
    },
    select: {
      id: true,
      title: true,
      body: true,
      staff: { select: { pushDevices: { select: { token: true } } } },
    },
  });

const groupByMessage = (targets: Awaited<ReturnType<typeof findPushTargets>>) => {
  const groups = new Map<string, StaffPushGroup>();

  for (const { id, title, body, staff } of targets) {
    const key = JSON.stringify([title, body]);
    const group = groups.get(key) ?? { title, body, notificationIdByToken: new Map() };
    for (const { token } of staff?.pushDevices ?? []) group.notificationIdByToken.set(token, id);
    groups.set(key, group);
  }

  return [...groups.values()];
};

export const pushStaffNotifications = async (notificationIds: number[]) => {
  if (notificationIds.length === 0) return;

  try {
    const groups = groupByMessage(await findPushTargets(notificationIds));

    for (const { title, body, notificationIdByToken } of groups) {
      const tokens = [...notificationIdByToken.keys()];
      const { sentTokens, invalidTokens } = await sendPushToTokens(tokens, {
        title,
        body,
        link: "/",
      });

      if (invalidTokens.length > 0) {
        await prisma.pushDevice.deleteMany({ where: { token: { in: invalidTokens } } });
      }

      const pushedIds = [...new Set(sentTokens.map((token) => notificationIdByToken.get(token)!))];
      if (pushedIds.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: pushedIds } },
          data: { channel: "PUSH" },
        });
      }
    }
  } catch (error) {
    console.error("Failed to push staff notifications", error);
  }
};
