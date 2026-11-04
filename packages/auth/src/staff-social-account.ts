import { Prisma, prisma } from "database";

import type { SocialIdentity } from "./oauth";
import type { ProviderToken } from "./oauth/types";

export const findOrCreateStaffBySocialIdentity = async (
  identity: SocialIdentity,
  providerToken: ProviderToken | null = null,
): Promise<{ staffId: number; isNewStaff: boolean }> => {
  const where = {
    provider_providerUserId: {
      provider: identity.provider,
      providerUserId: identity.providerUserId,
    },
  };
  const existing = await prisma.staffSocialAccount.findUnique({ where });

  if (existing) {
    const emailChanged = identity.email !== null && identity.email !== existing.email;

    if (emailChanged || providerToken) {
      await prisma.staffSocialAccount.update({
        where,
        data: {
          ...(emailChanged && { email: identity.email }),
          ...(providerToken && {
            providerRefreshToken: providerToken.refreshToken,
            providerClientId: providerToken.clientId,
          }),
        },
      });
    }
    return { staffId: existing.staffId, isNewStaff: false };
  }

  try {
    const staff = await prisma.staff.create({
      data: {
        socialAccounts: {
          create: {
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            email: identity.email,
            providerRefreshToken: providerToken?.refreshToken ?? null,
            providerClientId: providerToken?.clientId ?? null,
          },
        },
      },
    });
    return { staffId: staff.id, isNewStaff: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const created = await prisma.staffSocialAccount.findUniqueOrThrow({ where });
      return { staffId: created.staffId, isNewStaff: false };
    }
    throw error;
  }
};
