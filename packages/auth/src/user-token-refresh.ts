import { prisma } from "database";

import { InvalidRefreshTokenError } from "./errors";
import { hashToken } from "./tokens";
import { issueUserTokens } from "./user-social-sign-in";

export const refreshUserTokens = async (input: {
  refreshToken: string;
  userAgent: string | null;
}) => {
  const now = new Date();
  const stored = await prisma.userRefreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { user: { select: { deletedAt: true } } },
  });

  if (!stored || stored.revokedAt || stored.expiresAt <= now || stored.user.deletedAt) {
    throw new InvalidRefreshTokenError();
  }

  const { count } = await prisma.userRefreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: now, lastUsedAt: now },
  });

  if (count === 0) {
    throw new InvalidRefreshTokenError();
  }

  return issueUserTokens(stored.userId, input.userAgent);
};
