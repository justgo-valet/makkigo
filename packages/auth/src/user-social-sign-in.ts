import { Prisma, prisma } from "database";

import { verifySocialToken } from "./providers";
import { createAccessToken, createRefreshToken, hashToken } from "./tokens";

import type { SocialIdentity } from "./providers";
import type { IssuedToken } from "./tokens";
import type { SocialProvider } from "database";

export interface UserSocialSignInResult {
  userId: number;
  isNewUser: boolean;
  accessToken: IssuedToken;
  refreshToken: IssuedToken;
}

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

export const issueUserTokens = async (userId: number, userAgent: string | null) => {
  const accessToken = await createAccessToken("users", userId);
  const refreshToken = createRefreshToken();

  await prisma.userRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken.token),
      userAgent: userAgent?.slice(0, 400) ?? null,
      expiresAt: refreshToken.expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

export const signInUserWithSocial = async (input: {
  provider: SocialProvider;
  token: string;
  userAgent: string | null;
}): Promise<UserSocialSignInResult> => {
  const identity = await verifySocialToken(input.provider, input.token);
  const { userId, isNewUser } = await findOrCreateUserBySocialIdentity(identity);
  const tokens = await issueUserTokens(userId, input.userAgent);

  return { userId, isNewUser, ...tokens };
};
