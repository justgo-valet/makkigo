import "server-only";
import { prisma } from "database";

const LOCATION_USE_LOG_RETENTION_MONTHS = 6;

const retentionCutoff = (now: Date) => {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - LOCATION_USE_LOG_RETENTION_MONTHS);
  return cutoff;
};

const countOldLocationUseLogs = (now = new Date()) =>
  prisma.locationUseLog.count({ where: { createdAt: { lt: retentionCutoff(now) } } });

const deleteOldLocationUseLogs = async (now = new Date()) => {
  const { count } = await prisma.locationUseLog.deleteMany({
    where: { createdAt: { lt: retentionCutoff(now) } },
  });

  return count;
};

export { countOldLocationUseLogs, deleteOldLocationUseLogs };
