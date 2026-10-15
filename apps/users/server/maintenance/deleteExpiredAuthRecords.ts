import "server-only";
import { prisma } from "database";

const REVOKED_REFRESH_TOKEN_KEEP_MS = 24 * 60 * 60 * 1000;

const expiredAuthRecordWhere = (now: Date) => ({
  refreshTokens: {
    OR: [
      { expiresAt: { lte: now } },
      { revokedAt: { lte: new Date(now.getTime() - REVOKED_REFRESH_TOKEN_KEEP_MS) } },
    ],
  },
  loginCodes: { expiresAt: { lte: now } },
});

const countExpiredAuthRecords = async (now = new Date()) => {
  const where = expiredAuthRecordWhere(now);
  const [refreshTokens, loginCodes] = await Promise.all([
    prisma.userRefreshToken.count({ where: where.refreshTokens }),
    prisma.userLoginCode.count({ where: where.loginCodes }),
  ]);

  return { refreshTokens, loginCodes };
};

const deleteExpiredAuthRecords = async (now = new Date()) => {
  const where = expiredAuthRecordWhere(now);
  const [refreshTokens, loginCodes] = await prisma.$transaction([
    prisma.userRefreshToken.deleteMany({ where: where.refreshTokens }),
    prisma.userLoginCode.deleteMany({ where: where.loginCodes }),
  ]);

  return { refreshTokens: refreshTokens.count, loginCodes: loginCodes.count };
};

export { countExpiredAuthRecords, deleteExpiredAuthRecords };
