import { prisma } from "database";

import { sendPushToTokens } from "./fcm";

import type { NotificationChannel, NotificationType } from "database";
import type { PushMessage } from "./fcm";

export interface UserNotification extends PushMessage {
  userId: number;
  type: NotificationType;
  valetSessionId?: number;
}

const hasAgreedToAppPush = async (userId: number) => {
  const latest = await prisma.userConsent.findFirst({
    where: { userId, type: "APP_PUSH" },
    orderBy: { createdAt: "desc" },
    select: { agreed: true },
  });

  return latest?.agreed === true;
};

const pushToUser = async (userId: number, message: PushMessage) => {
  if (!(await hasAgreedToAppPush(userId))) return false;

  const devices = await prisma.pushDevice.findMany({ where: { userId }, select: { token: true } });

  try {
    const { sentCount, invalidTokens } = await sendPushToTokens(
      devices.map(({ token }) => token),
      message,
    );

    if (invalidTokens.length > 0) {
      await prisma.pushDevice.deleteMany({ where: { token: { in: invalidTokens } } });
    }

    return sentCount > 0;
  } catch (error) {
    console.error("Failed to send push", error);
    return false;
  }
};

export const sendUserNotification = async ({
  userId,
  type,
  valetSessionId,
  ...message
}: UserNotification) => {
  const channel: NotificationChannel | null = (await pushToUser(userId, message)) ? "PUSH" : null;

  await prisma.notification.create({
    data: { userId, type, valetSessionId, channel, title: message.title, body: message.body },
  });

  return { channel };
};
