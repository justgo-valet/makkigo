import { Prisma, prisma } from "database";

import type { SocialIdentity } from "./oauth";

/** 탈퇴 때 철회하려고 저장하는 제공자 리프레시 토큰과, 그 토큰을 발급받은 클라이언트 ID (지금은 애플만). */
export interface ProviderToken {
  refreshToken: string;
  clientId: string;
}

export const findOrCreateUserBySocialIdentity = async (
  identity: SocialIdentity,
  providerToken: ProviderToken | null = null,
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

    if (emailChanged || providerToken) {
      await prisma.userSocialAccount.update({
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
            providerRefreshToken: providerToken?.refreshToken ?? null,
            providerClientId: providerToken?.clientId ?? null,
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
