import "server-only";
import { prisma } from "database";

import { hasAgreedToConsent } from "@/server/consent/hasRequiredConsents";

import type { ProfileResponse } from "@/libs/user/contracts/profile";

const getProfile = async (userId: number): Promise<ProfileResponse> => {
  const [user, appPush, alimtalk, locationBasedService] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        phone: true,
        vehicle: { select: { plateNumber: true } },
        socialAccounts: { select: { provider: true, email: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    hasAgreedToConsent(userId, "APP_PUSH"),
    hasAgreedToConsent(userId, "ALIMTALK"),
    hasAgreedToConsent(userId, "LOCATION_BASED_SERVICE"),
  ]);

  return {
    phoneNumber: user.phone,
    plateNumber: user.vehicle?.plateNumber ?? null,
    socialAccounts: user.socialAccounts,
    consents: { appPush, alimtalk, locationBasedService },
  };
};

export { getProfile };
