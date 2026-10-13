import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMerchantUploadCleanupService } from "./cleanupMerchantUploads";

import type { CleanupCandidate, CleanupRepository } from "./cleanupMerchantUploads";

const attached: CleanupCandidate = {
  id: "018f47a3-7b4c-7b1f-8db8-743c634d9650",
  state: "ATTACHED",
  stagingKey: "merchants/staging/a",
  finalKey: "merchants/final/a",
  sweptBefore: false,
};
const tombstoned: CleanupCandidate = {
  ...attached,
  id: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
  state: "TOMBSTONED",
  stagingKey: "merchants/staging/b",
  finalKey: "merchants/final/b",
};
const revoked: CleanupCandidate = {
  ...attached,
  id: "018f47a3-7b4c-7b1f-8db8-743c634d9652",
  state: "REVOKED",
  stagingKey: "merchants/staging/c",
  finalKey: "merchants/final/c",
};

const repository = (): CleanupRepository => ({
  expireSessions: vi.fn().mockResolvedValue(undefined),
  inspect: vi.fn().mockResolvedValue({
    eligibleCount: 2,
    oldestEligibleAt: new Date("2026-10-10T00:00:00.000Z"),
  }),
  claim: vi.fn().mockResolvedValue([attached, tombstoned]),
  complete: vi.fn().mockResolvedValue(true),
  fail: vi.fn().mockResolvedValue(true),
});

describe("cleanupMerchantUploads", () => {
  const storage = { deleteObject: vi.fn().mockResolvedValue(undefined) };
  const fixedNow = () => new Date("2026-10-10T01:00:00.000Z");

  beforeEach(() => vi.clearAllMocks());

  it("keeps dry-run completely read-only", async () => {
    const repo = repository();
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: fixedNow,
    });

    await expect(cleanup({ dryRun: true, batchSize: 1 })).resolves.toEqual({
      dryRun: true,
      eligibleCount: 2,
      oldestEligibleAgeSeconds: 3_600,
      claimed: 0,
      cleaned: 0,
      failed: 0,
      partial: true,
      nextSweepAfterSeconds: 3_600,
    });
    expect(repo.expireSessions).not.toHaveBeenCalled();
    expect(repo.claim).not.toHaveBeenCalled();
    expect(repo.complete).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("never deletes an ATTACHED final and deletes both tombstoned keys", async () => {
    const repo = repository();
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: fixedNow,
    });

    await expect(cleanup({ dryRun: false })).resolves.toMatchObject({ cleaned: 2, failed: 0 });
    expect(storage.deleteObject).toHaveBeenCalledTimes(3);
    expect(storage.deleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: attached.stagingKey }),
    );
    expect(storage.deleteObject).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: attached.finalKey }),
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: tombstoned.finalKey }),
    );
  });

  it("closes overdue sessions before claiming and stops re-sweeping after one re-check", async () => {
    const repo = repository();
    vi.mocked(repo.claim).mockResolvedValue([tombstoned, { ...revoked, sweptBefore: true }]);
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: fixedNow,
    });

    await cleanup({ dryRun: false });
    expect(vi.mocked(repo.expireSessions).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repo.claim).mock.invocationCallOrder[0] ?? 0,
    );
    expect(repo.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadId: tombstoned.id,
        nextSweepAt: new Date("2026-10-10T02:00:00.000Z"),
      }),
    );
    expect(repo.complete).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId: revoked.id, nextSweepAt: null }),
    );
  });

  it("records a retry without exposing provider details when deletion fails", async () => {
    const repo = repository();
    storage.deleteObject.mockRejectedValueOnce(new Error("secret provider response"));
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: fixedNow,
    });

    await expect(cleanup({ dryRun: false })).resolves.toMatchObject({ cleaned: 1, failed: 1 });
    expect(repo.fail).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId: attached.id }),
    );
    expect(repo.fail).not.toHaveBeenCalledWith(expect.objectContaining({ error: expect.anything() }));
  });

  it("sweeps a revoked reservation's staging key but never its final key", async () => {
    const repo = repository();
    vi.mocked(repo.claim).mockResolvedValue([revoked]);
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: fixedNow,
    });

    await expect(cleanup({ dryRun: false })).resolves.toMatchObject({ cleaned: 1, failed: 0 });
    expect(storage.deleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: revoked.stagingKey }),
    );
    expect(storage.deleteObject).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: revoked.finalKey }),
    );
  });

  it("allows only one concurrent runner to own a candidate", async () => {
    const repo = repository();
    vi.mocked(repo.claim)
      .mockResolvedValueOnce([tombstoned])
      .mockResolvedValueOnce([]);
    const makeCleanup = (claimId: string) =>
      createMerchantUploadCleanupService({
        repository: repo,
        storage,
        createClaimId: () => claimId,
        now: fixedNow,
      });

    const [first, second] = await Promise.all([
      makeCleanup("018f47a3-7b4c-7b1f-8db8-743c634d9658")({ dryRun: false }),
      makeCleanup("018f47a3-7b4c-7b1f-8db8-743c634d9659")({ dryRun: false }),
    ]);
    expect(first.cleaned + second.cleaned).toBe(1);
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
  });

  it("cannot cross session-scoped keys while a newer registration proceeds", async () => {
    const repo = repository();
    vi.mocked(repo.claim).mockResolvedValue([
      {
        ...tombstoned,
        stagingKey: "merchants/staging/7/session-a/upload.jpg",
        finalKey: "merchants/final/7/session-a/upload.jpg",
      },
    ]);
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: fixedNow,
    });

    await cleanup({ dryRun: false });
    expect(storage.deleteObject).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringContaining("session-b") }),
    );
    expect(repo.complete).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId: tombstoned.id, state: "TOMBSTONED" }),
    );
  });

  it("stops starting work after the bounded budget", async () => {
    const repo = repository();
    const times = [
      new Date("2026-10-10T01:00:00.000Z"),
      new Date("2026-10-10T01:00:00.100Z"),
    ];
    const cleanup = createMerchantUploadCleanupService({
      repository: repo,
      storage,
      createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
      now: () => times.shift() ?? new Date("2026-10-10T01:00:00.100Z"),
      startBudgetMs: 50,
    });

    await expect(cleanup({ dryRun: false })).resolves.toMatchObject({
      cleaned: 0,
      partial: true,
    });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("aborts a hung storage request at the per-call timeout", async () => {
    vi.useFakeTimers();
    try {
      const repo = repository();
      vi.mocked(repo.claim).mockResolvedValue([attached]);
      storage.deleteObject.mockImplementation(
        ({ abortSignal }: { abortSignal?: AbortSignal }) =>
          new Promise((_, reject) =>
            abortSignal?.addEventListener("abort", () => reject(abortSignal.reason), { once: true }),
          ),
      );
      const cleanup = createMerchantUploadCleanupService({
        repository: repo,
        storage,
        createClaimId: () => "018f47a3-7b4c-7b1f-8db8-743c634d9659",
        now: fixedNow,
        ioTimeoutMs: 10,
      });
      const result = cleanup({ dryRun: false });
      await vi.advanceTimersByTimeAsync(10);
      await expect(result).resolves.toMatchObject({ cleaned: 0, failed: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});
