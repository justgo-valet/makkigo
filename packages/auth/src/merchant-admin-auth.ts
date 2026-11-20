import { Prisma, prisma } from "database";

import { InvalidPasswordError, InvalidRefreshTokenError } from "./errors";
import { createTemporaryPassword, hashPassword } from "./password";
import { checkPasswordLogin, type UpdatePasswordAccounts } from "./password-login";
import { isValidPassword, normalizeLoginId } from "./password-policy";
import { createAccessToken, createRefreshToken, hashToken, verifyAccessToken } from "./tokens";

const accountSelect = { id: true, passwordHash: true, disabledAt: true, passwordChangeRequired: true } as const;

const updateAccounts: UpdatePasswordAccounts = (args) => prisma.merchantAdmin.updateMany(args);

const issueMerchantAdminTokens = async (
  merchantAdminId: number,
  userAgent: string | null,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  const accessToken = await createAccessToken("merchant-admin", merchantAdminId);
  const refreshToken = createRefreshToken();
  await client.merchantAdminRefreshToken.create({
    data: {
      merchantAdminId,
      tokenHash: hashToken(refreshToken.token),
      userAgent: userAgent?.slice(0, 400) ?? null,
      expiresAt: refreshToken.expiresAt,
    },
  });
  return { accessToken, refreshToken };
};

const revokeAllRefreshTokens = (merchantAdminId: number, client: Prisma.TransactionClient) =>
  client.merchantAdminRefreshToken.updateMany({
    where: { merchantAdminId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

export const loginMerchantAdmin = async (input: {
  loginId: string;
  password: string;
  userAgent: string | null;
}) => {
  const loginId = normalizeLoginId(input.loginId);
  const merchantAdmin = loginId
    ? await prisma.merchantAdmin.findUnique({ where: { loginId }, select: accountSelect })
    : null;
  const account = await checkPasswordLogin(merchantAdmin, input.password, updateAccounts);
  const tokens = await issueMerchantAdminTokens(account.id, input.userAgent);
  return { ...tokens, passwordChangeRequired: account.passwordChangeRequired };
};

export const refreshMerchantAdminTokens = async (input: { refreshToken: string; userAgent: string | null }) => {
  const now = new Date();
  const stored = await prisma.merchantAdminRefreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { merchantAdmin: { select: { disabledAt: true } } },
  });
  if (!stored || stored.revokedAt || stored.expiresAt <= now || stored.merchantAdmin.disabledAt) {
    throw new InvalidRefreshTokenError();
  }
  return prisma.$transaction(async (transaction) => {
    const { count } = await transaction.merchantAdminRefreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now, lastUsedAt: now },
    });
    if (count === 0) throw new InvalidRefreshTokenError();
    return issueMerchantAdminTokens(stored.merchantAdminId, input.userAgent, transaction);
  });
};

export const revokeMerchantAdminRefreshToken = async (refreshToken: string) => {
  await prisma.merchantAdminRefreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const getActiveMerchantAdminIdFromAccessToken = async (accessToken: string) => {
  const merchantAdminId = await verifyAccessToken("merchant-admin", accessToken);
  if (!merchantAdminId) return null;
  const merchantAdmin = await prisma.merchantAdmin.findUnique({
    where: { id: merchantAdminId },
    select: { disabledAt: true },
  });
  return merchantAdmin && !merchantAdmin.disabledAt ? merchantAdminId : null;
};

export const changeMerchantAdminPassword = async (input: {
  merchantAdminId: number;
  currentPassword: string;
  newPassword: string;
  userAgent: string | null;
}) => {
  if (!isValidPassword(input.newPassword) || input.newPassword === input.currentPassword) {
    throw new InvalidPasswordError();
  }
  const merchantAdmin = await prisma.merchantAdmin.findUnique({
    where: { id: input.merchantAdminId },
    select: accountSelect,
  });
  const account = await checkPasswordLogin(merchantAdmin, input.currentPassword, updateAccounts);
  const passwordHash = await hashPassword(input.newPassword);
  return prisma.$transaction(async (transaction) => {
    await transaction.merchantAdmin.update({
      where: { id: account.id },
      data: { passwordHash, passwordChangeRequired: false },
    });
    await revokeAllRefreshTokens(account.id, transaction);
    return issueMerchantAdminTokens(account.id, input.userAgent, transaction);
  });
};

export const resetMerchantAdminPassword = async (merchantAdminId: number) => {
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  return prisma.$transaction(async (transaction) => {
    const { count } = await transaction.merchantAdmin.updateMany({
      where: { id: merchantAdminId, disabledAt: null },
      data: { passwordHash, passwordChangeRequired: true, failedLoginCount: 0, lockedUntil: null },
    });
    if (count === 0) return null;
    await revokeAllRefreshTokens(merchantAdminId, transaction);
    return temporaryPassword;
  });
};

export const disableMerchantAdmin = async (merchantAdminId: number) =>
  prisma.$transaction(async (transaction) => {
    const { count } = await transaction.merchantAdmin.updateMany({
      where: { id: merchantAdminId, disabledAt: null },
      data: { disabledAt: new Date() },
    });
    await revokeAllRefreshTokens(merchantAdminId, transaction);
    return count > 0;
  });
