import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    vehicle: { findUnique: vi.fn() },
    valetSession: { findFirst: vi.fn() },
    userSocialAccount: { deleteMany: vi.fn() },
    pushDevice: { deleteMany: vi.fn() },
    locationUseLog: { deleteMany: vi.fn() },
    userRefreshToken: { updateMany: vi.fn() },
    user: { update: vi.fn() },
  };

  return {
    tx,
    prisma: {
      userSocialAccount: { findMany: vi.fn() },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    },
    revokeAppleRefreshToken: vi.fn(),
  };
});

vi.mock("database", () => ({
  ACTIVE_VALET_SESSION_STATUSES: ["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"],
  lockPlateNumber: (client: typeof db.tx, plateNumber: string) => client.$executeRaw(plateNumber),
  prisma: db.prisma,
}));
vi.mock("@makkigo/auth", () => ({ revokeAppleRefreshToken: db.revokeAppleRefreshToken }));

import { withdrawUser } from "./withdrawUser";

describe("withdrawUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.tx.vehicle.findUnique.mockResolvedValue({ plateNumber: "12가3456" });
    db.tx.valetSession.findFirst.mockResolvedValue(null);
    db.prisma.userSocialAccount.findMany.mockResolvedValue([]);
    db.revokeAppleRefreshToken.mockResolvedValue(true);
  });

  it("rejects withdrawal while a valet session is in progress", async () => {
    db.tx.valetSession.findFirst.mockResolvedValue({ id: 7 });
    db.prisma.userSocialAccount.findMany.mockResolvedValue([
      { providerRefreshToken: "apple-refresh" },
    ]);

    await expect(withdrawUser(1)).resolves.toEqual({
      ok: false,
      reason: "ACTIVE_VALET_SESSION",
    });
    expect(db.tx.valetSession.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 1,
        status: { in: ["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"] },
      },
      select: { id: true },
    });
    expect(db.tx.user.update).not.toHaveBeenCalled();
    expect(db.tx.userSocialAccount.deleteMany).not.toHaveBeenCalled();
    expect(db.revokeAppleRefreshToken).not.toHaveBeenCalled();
  });

  it("locks the vehicle plate before checking sessions", async () => {
    await withdrawUser(1);

    expect(db.tx.$executeRaw).toHaveBeenCalledWith("12가3456");
    expect(db.tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.tx.valetSession.findFirst.mock.invocationCallOrder[0]!,
    );
  });

  it("withdraws when there is no session in progress", async () => {
    db.tx.vehicle.findUnique.mockResolvedValue(null);

    await expect(withdrawUser(1)).resolves.toEqual({ ok: true });
    expect(db.tx.$executeRaw).not.toHaveBeenCalled();
    expect(db.tx.userSocialAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(db.tx.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date), personalDataPurgeAt: expect.any(Date) },
    });
    expect(db.revokeAppleRefreshToken).not.toHaveBeenCalled();
  });

  it("revokes stored Apple tokens after the withdrawal transaction", async () => {
    db.prisma.userSocialAccount.findMany.mockResolvedValue([
      { providerRefreshToken: "apple-refresh" },
    ]);

    await expect(withdrawUser(7)).resolves.toEqual({ ok: true });

    expect(db.prisma.userSocialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 7, provider: "APPLE" }) }),
    );
    expect(db.revokeAppleRefreshToken).toHaveBeenCalledWith("apple-refresh");
    expect(db.tx.user.update.mock.invocationCallOrder[0]).toBeLessThan(
      db.revokeAppleRefreshToken.mock.invocationCallOrder[0]!,
    );
  });

  it("finishes the withdrawal without logging the token when revoking fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    db.prisma.userSocialAccount.findMany.mockResolvedValue([
      { providerRefreshToken: "apple-refresh" },
    ]);
    db.revokeAppleRefreshToken.mockRejectedValue(new Error("apple down"));

    await expect(withdrawUser(7)).resolves.toEqual({ ok: true });

    expect(JSON.stringify(log.mock.calls)).not.toContain("apple-refresh");
    log.mockRestore();
  });
});
