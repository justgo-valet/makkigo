import { Prisma, prisma } from "database";

import type { SocialIdentity } from "./oauth";

export const findOrCreateUserBySocialIdentity = async (
  identity: SocialIdentity,
): Promise<{ userId: number; isNewUser: boolean }> => {
  const where = {
    provider_providerUserId: {
      provider: identity.provider,
      providerUserId: identity.providerUserId,
    },
  };

  const existing = await prisma.userSocialAccount.findUnique({ where });

  if (existing) {
    if (identity.email && identity.email !== existing.email) {
      await prisma.userSocialAccount.update({ where, data: { email: identity.email } });
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
