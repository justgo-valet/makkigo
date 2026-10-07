import "server-only";
import { prisma } from "database";

const PERSONAL_DATA_RETENTION_DAYS = 30;

const withdrawUser = async (userId: number) => {
  const now = new Date();
  const personalDataPurgeAt = new Date(
    now.getTime() + PERSONAL_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.$transaction([
    prisma.userSocialAccount.deleteMany({ where: { userId } }),
    prisma.userRefreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { deletedAt: now, personalDataPurgeAt },
    }),
  ]);
};

export { PERSONAL_DATA_RETENTION_DAYS, withdrawUser };
