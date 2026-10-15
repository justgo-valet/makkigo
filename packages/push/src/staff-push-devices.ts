import { prisma } from "database";

import type { DevicePlatform } from "database";

export const registerStaffPushDevice = (staffId: number, token: string, platform: DevicePlatform) =>
  prisma.pushDevice.upsert({
    where: { token },
    create: { staffId, token, platform },
    update: { staffId, userId: null, platform },
  });

export const removeStaffPushDevice = (staffId: number, token: string) =>
  prisma.pushDevice.deleteMany({ where: { staffId, token } });
