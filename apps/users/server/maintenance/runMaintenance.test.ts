import { afterEach, describe, expect, it, vi } from "vitest";

const jobs = vi.hoisted(() => ({
  countDueWithdrawnUsers: vi.fn(),
  purgeWithdrawnUsers: vi.fn(),
  countExpiredAuthRecords: vi.fn(),
  deleteExpiredAuthRecords: vi.fn(),
  countOldLocationUseLogs: vi.fn(),
  deleteOldLocationUseLogs: vi.fn(),
}));

vi.mock("@/server/maintenance/purgeWithdrawnUsers", () => jobs);
vi.mock("@/server/maintenance/deleteExpiredAuthRecords", () => jobs);
vi.mock("@/server/maintenance/deleteOldLocationUseLogs", () => jobs);

import { runMaintenance } from "./runMaintenance";

describe("runMaintenance", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps running the other jobs when one fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    jobs.purgeWithdrawnUsers.mockRejectedValue(new Error("db down"));
    jobs.deleteExpiredAuthRecords.mockResolvedValue({ refreshTokens: 3, loginCodes: 1 });
    jobs.deleteOldLocationUseLogs.mockResolvedValue(4);

    expect(await runMaintenance({ dryRun: false })).toEqual({
      ok: false,
      dryRun: false,
      withdrawnUsers: null,
      expiredAuthRecords: { refreshTokens: 3, loginCodes: 1 },
      oldLocationUseLogs: 4,
    });
  });

  it("only counts on a dry run", async () => {
    jobs.countDueWithdrawnUsers.mockResolvedValue(2);
    jobs.countExpiredAuthRecords.mockResolvedValue({ refreshTokens: 5, loginCodes: 0 });
    jobs.countOldLocationUseLogs.mockResolvedValue(7);

    expect(await runMaintenance({ dryRun: true })).toEqual({
      ok: true,
      dryRun: true,
      withdrawnUsers: { purged: 0, remaining: 2 },
      expiredAuthRecords: { refreshTokens: 5, loginCodes: 0 },
      oldLocationUseLogs: 7,
    });
    expect(jobs.purgeWithdrawnUsers).not.toHaveBeenCalled();
    expect(jobs.deleteExpiredAuthRecords).not.toHaveBeenCalled();
    expect(jobs.deleteOldLocationUseLogs).not.toHaveBeenCalled();
  });
});
