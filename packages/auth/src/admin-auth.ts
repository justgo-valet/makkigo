import { Prisma, prisma } from "database";

import { InvalidRefreshTokenError } from "./errors";
import { checkPasswordLogin } from "./password-login";
import { normalizeLoginId } from "./password-policy";
import { createAccessToken, createRefreshToken, hashToken, verifyAccessToken } from "./tokens";

const issueAdminTokens = async (
  adminId: number,
  userAgent: string | null,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  const accessToken = await createAccessToken("admin", adminId);
  const refreshToken = createRefreshToken();
  await client.adminRefreshToken.create({
    data: {
      adminId,
      tokenHash: hashToken(refreshToken.token),
      userAgent: userAgent?.slice(0, 400) ?? null,
      expiresAt: refreshToken.expiresAt,
    },
  });
  return { accessToken, refreshToken };
};

export const loginAdmin = async (input: { loginId: string; password: string; userAgent: string | null }) => {
  const loginId = normalizeLoginId(input.loginId);
  const admin = loginId
    ? await prisma.admin.findUnique({
        where: { loginId },
        select: { id: true, passwordHash: true, disabledAt: true },
      })
    : null;
  const account = await checkPasswordLogin(admin, input.password, (args) => prisma.admin.updateMany(args));
  return issueAdminTokens(account.id, input.userAgent);
};

export const refreshAdminTokens = async (input: { refreshToken: string; userAgent: string | null }) => {
  const now = new Date();
  const stored = await prisma.adminRefreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { admin: { select: { disabledAt: true } } },
  });
  if (!stored || stored.revokedAt || stored.expiresAt <= now || stored.admin.disabledAt) {
    throw new InvalidRefreshTokenError();
  }
  return prisma.$transaction(async (transaction) => {
    const { count } = await transaction.adminRefreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now, lastUsedAt: now },
    });
    if (count === 0) throw new InvalidRefreshTokenError();
    return issueAdminTokens(stored.adminId, input.userAgent, transaction);
  });
};

export const revokeAdminRefreshToken = async (refreshToken: string) => {
  await prisma.adminRefreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const getActiveAdminIdFromAccessToken = async (accessToken: string) => {
  const adminId = await verifyAccessToken("admin", accessToken);
  if (!adminId) return null;
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { disabledAt: true } });
  return admin && !admin.disabledAt ? adminId : null;
};
