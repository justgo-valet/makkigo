import "server-only";
import { prisma } from "database";

const PURGE_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 20;

const dueWithdrawnUserWhere = (now: Date) => ({
  deletedAt: { not: null },
  personalDataPurgeAt: { lte: now },
});

const purgeUser = (userId: number) =>
  prisma.$transaction([
    prisma.vehicle.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.userLoginCode.deleteMany({ where: { userId } }),
    prisma.userRefreshToken.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { phone: null, personalDataPurgeAt: null },
    }),
  ]);

const countDueWithdrawnUsers = (now = new Date()) =>
  prisma.user.count({ where: dueWithdrawnUserWhere(now) });

const purgeWithdrawnUsers = async (now = new Date()) => {
  let purged = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const users = await prisma.user.findMany({
      where: dueWithdrawnUserWhere(now),
      select: { id: true },
      orderBy: { personalDataPurgeAt: "asc" },
      take: PURGE_BATCH_SIZE,
    });

    for (const { id } of users) {
      await purgeUser(id);
      purged += 1;
    }

    if (users.length < PURGE_BATCH_SIZE) break;
  }

  return { purged, remaining: await countDueWithdrawnUsers(now) };
};

export { countDueWithdrawnUsers, purgeWithdrawnUsers };
