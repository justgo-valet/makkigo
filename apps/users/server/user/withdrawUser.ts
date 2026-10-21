import "server-only";
import { prisma } from "database";

import { hasActiveValetSession } from "@/server/user/hasActiveValetSession";
import { revokeAppleTokens, toAppleTokens } from "@/server/user/revokeAppleTokens";

import type { WithdrawErrorCode } from "@/libs/user/contracts/withdraw";

const PERSONAL_DATA_RETENTION_DAYS = 30;

type WithdrawUserResult = { ok: true } | { ok: false; reason: WithdrawErrorCode };

const withdrawUser = async (userId: number): Promise<WithdrawUserResult> => {
  const now = new Date();
  const personalDataPurgeAt = new Date(
    now.getTime() + PERSONAL_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const appleAccounts = await prisma.userSocialAccount.findMany({
    where: { userId, provider: "APPLE", providerRefreshToken: { not: null } },
    select: { providerRefreshToken: true, providerClientId: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (await hasActiveValetSession(tx, userId)) {
      return { ok: false, reason: "ACTIVE_VALET_SESSION" } as const;
    }

    await tx.userSocialAccount.deleteMany({ where: { userId } });
    await tx.pushDevice.deleteMany({ where: { userId } });
    await tx.locationUseLog.deleteMany({ where: { userId } });
    await tx.userRefreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.user.update({
      where: { id: userId },
      data: { deletedAt: now, personalDataPurgeAt },
    });

    return { ok: true } as const;
  });

  if (result.ok) {
    await revokeAppleTokens(toAppleTokens(appleAccounts));
  }

  return result;
};

export { PERSONAL_DATA_RETENTION_DAYS, withdrawUser };
