import "server-only";
import { prisma } from "database";

import { REQUIRED_CONSENT_TYPES } from "@/libs/consent/contracts/consents";
import { revokeAppleTokens, toAppleTokens } from "@/server/user/revokeAppleTokens";

import type { Prisma } from "database";

const INCOMPLETE_SIGNUP_RETENTION_DAYS = 30;
const PURGE_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 20;

const incompleteSignupWhere = (now: Date): Prisma.UserWhereInput => ({
  createdAt: {
    lte: new Date(now.getTime() - INCOMPLETE_SIGNUP_RETENTION_DAYS * 24 * 60 * 60 * 1000),
  },
  deletedAt: null,
  consents: { none: { agreed: true, type: { in: [...REQUIRED_CONSENT_TYPES] } } },
  valetSessions: { none: {} },
});

const countIncompleteSignups = (now = new Date()) =>
  prisma.user.count({ where: incompleteSignupWhere(now) });

const purgeIncompleteSignups = async (now = new Date()) => {
  let purged = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const users = await prisma.user.findMany({
      where: incompleteSignupWhere(now),
      select: {
        id: true,
        socialAccounts: {
          where: { provider: "APPLE", providerRefreshToken: { not: null } },
          select: { providerRefreshToken: true, providerClientId: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: PURGE_BATCH_SIZE,
    });

    for (const { id, socialAccounts } of users) {
      const { count } = await prisma.user.deleteMany({
        where: { id, ...incompleteSignupWhere(now) },
      });
      if (count === 0) continue;

      purged += 1;
      await revokeAppleTokens(toAppleTokens(socialAccounts));
    }

    if (users.length < PURGE_BATCH_SIZE) break;
  }

  return { purged, remaining: await countIncompleteSignups(now) };
};

export { INCOMPLETE_SIGNUP_RETENTION_DAYS, countIncompleteSignups, purgeIncompleteSignups };
