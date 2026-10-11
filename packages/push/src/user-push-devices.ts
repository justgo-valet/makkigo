import { prisma } from "database";

import type { DevicePlatform } from "database";

export const registerUserPushDevice = (userId: number, token: string, platform: DevicePlatform) =>
  prisma.pushDevice.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, staffId: null, platform },
  });

export const removeUserPushDevice = (userId: number, token: string) =>
  prisma.pushDevice.deleteMany({ where: { userId, token } });
