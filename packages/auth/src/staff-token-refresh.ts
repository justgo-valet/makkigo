import { prisma } from "database";

import { InvalidRefreshTokenError } from "./errors";
import { issueStaffTokens } from "./staff-tokens";
import { hashToken } from "./tokens";

export const refreshStaffTokens = async (input: { refreshToken: string; userAgent: string | null }) => {
  const now = new Date();
  const stored = await prisma.staffRefreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { staff: { select: { deletedAt: true } } },
  });
  if (!stored || stored.revokedAt || stored.expiresAt <= now || stored.staff.deletedAt) {
    throw new InvalidRefreshTokenError();
  }
  return prisma.$transaction(async (transaction) => {
    const { count } = await transaction.staffRefreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now, lastUsedAt: now },
    });
    if (count === 0) throw new InvalidRefreshTokenError();
    return issueStaffTokens(stored.staffId, input.userAgent, transaction);
  });
};
