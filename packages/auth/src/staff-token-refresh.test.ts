import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = { staffRefreshToken: { updateMany: vi.fn() } };
  return {
    findUnique: vi.fn(),
    transaction,
    runTransaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    issueStaffTokens: vi.fn(),
  };
});

vi.mock("database", () => ({
  prisma: {
    staffRefreshToken: { findUnique: mocks.findUnique },
    $transaction: mocks.runTransaction,
  },
}));
vi.mock("./staff-tokens", () => ({ issueStaffTokens: mocks.issueStaffTokens }));

import { InvalidRefreshTokenError } from "./errors";
import { refreshStaffTokens } from "./staff-token-refresh";

describe("refreshStaffTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({
      id: 3,
      staffId: 7,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      staff: { deletedAt: null },
    });
    mocks.transaction.staffRefreshToken.updateMany.mockResolvedValue({ count: 1 });
    mocks.issueStaffTokens.mockResolvedValue({ accessToken: {}, refreshToken: {} });
  });

  it("기존 토큰 폐기와 새 토큰 발급에 같은 트랜잭션을 사용한다", async () => {
    await refreshStaffTokens({ refreshToken: "refresh", userAgent: "test" });
    expect(mocks.runTransaction).toHaveBeenCalledOnce();
    expect(mocks.issueStaffTokens).toHaveBeenCalledWith(7, "test", mocks.transaction);
  });

  it("동시에 먼저 폐기된 토큰이면 새 토큰을 발급하지 않는다", async () => {
    mocks.transaction.staffRefreshToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      refreshStaffTokens({ refreshToken: "refresh", userAgent: null }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(mocks.issueStaffTokens).not.toHaveBeenCalled();
  });
});
