import "server-only";
import { prisma } from "database";

import { hasAgreedToConsent, hasRequiredConsents } from "@/server/consent/hasRequiredConsents";

import type { MeResponse } from "@/libs/user/contracts/me";

const getMe = async (userId: number): Promise<MeResponse> => {
  const [user, requiredConsentsAgreed, appPushAgreed] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { phone: true, vehicle: { select: { id: true } } },
    }),
    hasRequiredConsents(userId),
    hasAgreedToConsent(userId, "APP_PUSH"),
  ]);

  return {
    requiredConsentsAgreed,
    onboardingCompleted: Boolean(user.phone && user.vehicle),
    appPushAgreed,
  };
};

export { getMe };
