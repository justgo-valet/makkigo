import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const tx = {
    booth: { findMany: vi.fn(), updateMany: vi.fn() },
    merchant: { findMany: vi.fn(), updateMany: vi.fn() },
    valetSession: { findFirst: vi.fn() },
    staffSocialAccount: { deleteMany: vi.fn() },
    staffLoginCode: { deleteMany: vi.fn() },
    pushDevice: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    staffRefreshToken: { updateMany: vi.fn() },
    staff: { update: vi.fn() },
  };

  return {
    tx,
    prisma: {
      staffSocialAccount: { findMany: vi.fn() },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    },
    revokeAppleRefreshToken: vi.fn(),
  };
});

vi.mock("database", () => ({
  ACTIVE_VALET_SESSION_STATUSES: ["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"],
  prisma: db.prisma,
}));
vi.mock("@makkigo/auth", () => ({ revokeAppleRefreshToken: db.revokeAppleRefreshToken }));

import { withdrawStaff } from "./withdrawStaff";

const APPLE_ACCOUNT = { providerRefreshToken: "apple-refresh", providerClientId: "web-id" };

describe("withdrawStaff Apple token revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.tx.booth.findMany.mockResolvedValue([]);
    db.tx.merchant.findMany.mockResolvedValue([]);
    db.tx.valetSession.findFirst.mockResolvedValue(null);
    db.prisma.staffSocialAccount.findMany.mockResolvedValue([APPLE_ACCOUNT]);
    db.revokeAppleRefreshToken.mockResolvedValue(true);
  });

  it("탈퇴 데이터를 지운 뒤 저장해 둔 애플 토큰을 발급 클라이언트 ID 로 철회한다", async () => {
    await expect(withdrawStaff(7)).resolves.toEqual({ ok: true });

    expect(db.prisma.staffSocialAccount.findMany).toHaveBeenCalledWith({
      where: { staffId: 7, provider: "APPLE", providerRefreshToken: { not: null } },
      select: { providerRefreshToken: true, providerClientId: true },
    });
    expect(db.revokeAppleRefreshToken).toHaveBeenCalledWith("apple-refresh", "web-id");
    expect(db.tx.staff.update.mock.invocationCallOrder[0]!).toBeLessThan(
      db.revokeAppleRefreshToken.mock.invocationCallOrder[0]!,
    );
  });

  it("진행 중인 발렛이 있어 탈퇴를 막으면 철회하지 않는다", async () => {
    db.tx.valetSession.findFirst.mockResolvedValue({ id: 3 });

    await expect(withdrawStaff(7)).resolves.toEqual({
      ok: false,
      reason: "ACTIVE_VALET_SESSION",
    });
    expect(db.revokeAppleRefreshToken).not.toHaveBeenCalled();
  });

  it("애플 철회가 실패해도 탈퇴는 끝난다", async () => {
    db.revokeAppleRefreshToken.mockRejectedValue(new Error("apple down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(withdrawStaff(7)).resolves.toEqual({ ok: true });
  });
});
