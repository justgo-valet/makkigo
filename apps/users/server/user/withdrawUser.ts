import "server-only";
import { revokeAppleRefreshToken } from "@makkigo/auth";
import { prisma } from "database";

import { hasActiveValetSession } from "@/server/user/hasActiveValetSession";

import type { WithdrawErrorCode } from "@/libs/user/contracts/withdraw";

const PERSONAL_DATA_RETENTION_DAYS = 30;

type WithdrawUserResult = { ok: true } | { ok: false; reason: WithdrawErrorCode };

const revokeAppleTokens = (refreshTokens: string[]) =>
  Promise.all(
    refreshTokens.map((refreshToken) =>
      revokeAppleRefreshToken(refreshToken).catch((error: unknown) => {
        console.error("Failed to revoke Apple token on withdrawal", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }),
    ),
  );

const withdrawUser = async (userId: number): Promise<WithdrawUserResult> => {
  const now = new Date();
  const personalDataPurgeAt = new Date(
    now.getTime() + PERSONAL_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const appleAccounts = await prisma.userSocialAccount.findMany({
    where: { userId, provider: "APPLE", providerRefreshToken: { not: null } },
    select: { providerRefreshToken: true },
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
    await revokeAppleTokens(
      appleAccounts.flatMap(({ providerRefreshToken }) =>
        providerRefreshToken ? [providerRefreshToken] : [],
      ),
    );
  }

  return result;
};

export { PERSONAL_DATA_RETENTION_DAYS, withdrawUser };
