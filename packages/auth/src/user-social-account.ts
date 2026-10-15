import { Prisma, prisma } from "database";

import type { SocialIdentity } from "./oauth";

export const findOrCreateUserBySocialIdentity = async (
  identity: SocialIdentity,
  providerRefreshToken: string | null = null,
): Promise<{ userId: number; isNewUser: boolean }> => {
  const where = {
    provider_providerUserId: {
      provider: identity.provider,
      providerUserId: identity.providerUserId,
    },
  };

  const existing = await prisma.userSocialAccount.findUnique({ where });

  if (existing) {
    const emailChanged = identity.email !== null && identity.email !== existing.email;

    if (emailChanged || providerRefreshToken) {
      await prisma.userSocialAccount.update({
        where,
        data: {
          ...(emailChanged && { email: identity.email }),
          ...(providerRefreshToken && { providerRefreshToken }),
        },
      });
    }
    return { userId: existing.userId, isNewUser: false };
  }

  try {
    const user = await prisma.user.create({
      data: {
        socialAccounts: {
          create: {
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            email: identity.email,
            providerRefreshToken,
          },
        },
      },
    });
    return { userId: user.id, isNewUser: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const created = await prisma.userSocialAccount.findUniqueOrThrow({ where });
      return { userId: created.userId, isNewUser: false };
    }
    throw error;
  }
};
