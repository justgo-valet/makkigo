import "server-only";

import { prisma } from "database";

import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";

import type { MerchantUploadStorage } from "@/server/merchantUploads/storage";

const TICKET_STAGING_RETENTION_MS = 24 * 60 * 60 * 1_000;
const MAX_BATCH_SIZE = 100;

interface CleanupDependencies {
  database: typeof prisma;
  storage?: Pick<MerchantUploadStorage, "deleteObject">;
  now: () => Date;
}

const defaultDependencies: CleanupDependencies = {
  database: prisma,
  now: () => new Date(),
};

const cleanupExpiredTicketUploads = async (
  input: { dryRun: boolean; batchSize: number },
  dependencies = defaultDependencies,
) => {
  const cutoff = new Date(dependencies.now().getTime() - TICKET_STAGING_RETENTION_MS);
  const batchSize = Math.max(1, Math.min(MAX_BATCH_SIZE, input.batchSize));
  const reservedWhere = { state: "RESERVED" as const, expiresAt: { lte: cutoff } };
  const completedWhere = {
    state: "COMPLETE" as const,
    stagingDeletedAt: null,
    expiresAt: { lte: cutoff },
  };
  const [eligibleCount, candidates] = await Promise.all([
    dependencies.database.ticketImageUpload.count({ where: reservedWhere }),
    dependencies.database.ticketImageUpload.findMany({
      where: {
        OR: [
          reservedWhere,
          completedWhere,
        ],
      },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      take: batchSize,
      select: { id: true, stagingKey: true, state: true },
    }),
  ]);
  const completedCount = await dependencies.database.ticketImageUpload.count({ where: completedWhere });
  const totalEligibleCount = eligibleCount + completedCount;
  if (input.dryRun) {
    return {
      eligibleCount: totalEligibleCount,
      claimed: 0,
      cleaned: 0,
      failed: 0,
      partial: totalEligibleCount > candidates.length,
    };
  }

  const storage = dependencies.storage ?? createS3MerchantUploadStorage();
  let cleaned = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      await storage.deleteObject({ key: candidate.stagingKey });
      if (candidate.state === "COMPLETE") {
        const result = await dependencies.database.ticketImageUpload.updateMany({
          where: { id: candidate.id, state: "COMPLETE", stagingDeletedAt: null },
          data: { stagingDeletedAt: dependencies.now() },
        });
        cleaned += result.count;
      } else {
        const result = await dependencies.database.ticketImageUpload.deleteMany({
          where: { id: candidate.id, state: "RESERVED", expiresAt: { lte: cutoff } },
        });
        cleaned += result.count;
      }
    } catch {
      failed += 1;
    }
  }
  return {
    eligibleCount: totalEligibleCount,
    claimed: candidates.length,
    cleaned,
    failed,
    partial: totalEligibleCount > candidates.length,
  };
};

export { cleanupExpiredTicketUploads };
export type { CleanupDependencies };
