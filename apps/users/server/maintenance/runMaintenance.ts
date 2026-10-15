import "server-only";
import {
  countExpiredAuthRecords,
  deleteExpiredAuthRecords,
} from "@/server/maintenance/deleteExpiredAuthRecords";
import {
  countOldLocationUseLogs,
  deleteOldLocationUseLogs,
} from "@/server/maintenance/deleteOldLocationUseLogs";
import {
  countDueWithdrawnUsers,
  purgeWithdrawnUsers,
} from "@/server/maintenance/purgeWithdrawnUsers";

type JobResult<T> = { ok: true; result: T } | { ok: false };

const runJob = async <T>(name: string, job: () => Promise<T>): Promise<JobResult<T>> => {
  try {
    return { ok: true, result: await job() };
  } catch (error) {
    console.error(`Maintenance job ${name} failed`, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false };
  }
};

const runMaintenance = async ({ dryRun }: { dryRun: boolean }) => {
  const now = new Date();

  const withdrawnUsers = await runJob("withdrawnUsers", async () =>
    dryRun ? { purged: 0, remaining: await countDueWithdrawnUsers(now) } : purgeWithdrawnUsers(now),
  );
  const authRecords = await runJob("authRecords", () =>
    dryRun ? countExpiredAuthRecords(now) : deleteExpiredAuthRecords(now),
  );
  const locationUseLogs = await runJob("locationUseLogs", () =>
    dryRun ? countOldLocationUseLogs(now) : deleteOldLocationUseLogs(now),
  );

  return {
    ok: withdrawnUsers.ok && authRecords.ok && locationUseLogs.ok,
    dryRun,
    withdrawnUsers: withdrawnUsers.ok ? withdrawnUsers.result : null,
    expiredAuthRecords: authRecords.ok ? authRecords.result : null,
    oldLocationUseLogs: locationUseLogs.ok ? locationUseLogs.result : null,
  };
};

export { runMaintenance };
