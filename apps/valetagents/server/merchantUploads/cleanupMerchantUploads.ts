import "server-only";

import type { MerchantUploadStorage } from "./storage";

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_IO_TIMEOUT_MS = 15_000;
const DEFAULT_START_BUDGET_MS = 45_000;

interface CleanupCandidate {
  id: string;
  state: "ATTACHED" | "REVOKED" | "TOMBSTONED";
  stagingKey: string;
  finalKey: string;
  sourceETag: string | null;
  finalETag: string | null;
}

interface CleanupInspection {
  eligibleCount: number;
  oldestEligibleAt: Date | null;
}

interface CleanupRepository {
  inspect(now: Date): Promise<CleanupInspection>;
  claim(input: {
    claimId: string;
    now: Date;
    leaseUntil: Date;
    limit: number;
  }): Promise<CleanupCandidate[]>;
  complete(input: {
    uploadId: string;
    claimId: string;
    state: CleanupCandidate["state"];
    now: Date;
    nextSweepAt: Date | null;
  }): Promise<boolean>;
  fail(input: {
    uploadId: string;
    claimId: string;
    now: Date;
    nextSweepAt: Date;
  }): Promise<boolean>;
}

interface CleanupDependencies {
  repository: CleanupRepository;
  storage: Pick<MerchantUploadStorage, "deleteObject">;
  createClaimId: () => string;
  now?: () => Date;
  ioTimeoutMs?: number;
  startBudgetMs?: number;
}

interface CleanupRequest {
  dryRun: boolean;
  batchSize?: number;
  signal?: AbortSignal;
}

const addMilliseconds = (date: Date, milliseconds: number) =>
  new Date(date.getTime() + milliseconds);

const deleteWithTimeout = async (
  storage: CleanupDependencies["storage"],
  target: { key: string; etag: string | null },
  timeoutMs: number,
  requestSignal?: AbortSignal,
) => {
  const controller = new AbortController();
  const abort = () => controller.abort(requestSignal?.reason);
  requestSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("S3 cleanup request timed out")), timeoutMs);
  try {
    await Promise.race([
      storage.deleteObject({ ...target, abortSignal: controller.signal }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(controller.signal.reason ?? new Error("S3 cleanup request aborted")),
          { once: true },
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    requestSignal?.removeEventListener("abort", abort);
  }
};

const createMerchantUploadCleanupService = (dependencies: CleanupDependencies) => {
  const now = dependencies.now ?? (() => new Date());
  const ioTimeoutMs = dependencies.ioTimeoutMs ?? DEFAULT_IO_TIMEOUT_MS;
  const startBudgetMs = dependencies.startBudgetMs ?? DEFAULT_START_BUDGET_MS;

  return async ({ dryRun, batchSize = DEFAULT_BATCH_SIZE, signal }: CleanupRequest) => {
    const boundedBatchSize = Math.max(1, Math.min(DEFAULT_BATCH_SIZE, batchSize));
    const startedAt = now();
    const inspection = await dependencies.repository.inspect(startedAt);
    const oldestEligibleAgeSeconds = inspection.oldestEligibleAt
      ? Math.max(0, Math.floor((startedAt.getTime() - inspection.oldestEligibleAt.getTime()) / 1_000))
      : null;

    if (dryRun) {
      return {
        dryRun: true,
        eligibleCount: inspection.eligibleCount,
        oldestEligibleAgeSeconds,
        claimed: 0,
        cleaned: 0,
        failed: 0,
        partial: inspection.eligibleCount > boundedBatchSize,
        nextSweepAfterSeconds: 60 * 60,
      };
    }

    const claimId = dependencies.createClaimId();
    const candidates = await dependencies.repository.claim({
      claimId,
      now: startedAt,
      leaseUntil: addMilliseconds(startedAt, 120_000),
      limit: boundedBatchSize,
    });
    let cleaned = 0;
    let failed = 0;
    let stoppedForBudget = false;

    for (const candidate of candidates) {
      if (signal?.aborted || now().getTime() - startedAt.getTime() >= startBudgetMs) {
        stoppedForBudget = true;
        break;
      }
      const targets = [
        { key: candidate.stagingKey, etag: candidate.sourceETag },
        ...(candidate.state === "TOMBSTONED"
          ? [{ key: candidate.finalKey, etag: candidate.finalETag }]
          : []),
      ];

      try {
        for (const target of targets) {
          await deleteWithTimeout(dependencies.storage, target, ioTimeoutMs, signal);
        }
        const completed = await dependencies.repository.complete({
          uploadId: candidate.id,
          claimId,
          state: candidate.state,
          now: now(),
          nextSweepAt:
            candidate.state === "ATTACHED" ? null : addMilliseconds(now(), 60 * 60 * 1_000),
        });
        if (!completed) throw new Error("Cleanup claim was lost before completion");
        cleaned += 1;
      } catch {
        failed += 1;
        await dependencies.repository.fail({
          uploadId: candidate.id,
          claimId,
          now: now(),
          nextSweepAt: addMilliseconds(now(), 60 * 60 * 1_000),
        });
      }
    }

    return {
      dryRun: false,
      eligibleCount: inspection.eligibleCount,
      oldestEligibleAgeSeconds,
      claimed: candidates.length,
      cleaned,
      failed,
      partial:
        stoppedForBudget || candidates.length === boundedBatchSize || inspection.eligibleCount > cleaned,
      nextSweepAfterSeconds: 60 * 60,
    };
  };
};

export {
  createMerchantUploadCleanupService,
  DEFAULT_BATCH_SIZE,
  DEFAULT_IO_TIMEOUT_MS,
  DEFAULT_START_BUDGET_MS,
};
export type { CleanupCandidate, CleanupInspection, CleanupRepository };
