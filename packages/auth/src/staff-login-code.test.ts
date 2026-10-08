import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashBase64Url, hashToken } from "./tokens";

const database = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("database", () => ({
  prisma: {
    staffLoginCode: {
      findUnique: database.findUnique,
      updateMany: database.updateMany,
    },
  },
}));

import { consumeStaffLoginCode } from "./staff-login-code";

const verifier = "v".repeat(43);
const storedCode = {
  id: 1,
  staffId: 7,
  appChallenge: hashBase64Url(verifier),
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  staff: { deletedAt: null },
};

describe("consumeStaffLoginCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.findUnique.mockResolvedValue(storedCode);
    database.updateMany.mockResolvedValue({ count: 1 });
  });

  it("verifier가 틀리면 코드를 소모하지 않는다", async () => {
    await expect(consumeStaffLoginCode("code", "wrong-verifier")).resolves.toBeNull();
    expect(database.findUnique).toHaveBeenCalledWith({
      where: { codeHash: hashToken("code") },
      include: { staff: { select: { deletedAt: true } } },
    });
    expect(database.updateMany).not.toHaveBeenCalled();
  });

  it("검증된 코드를 조건부 갱신한 호출자에게만 Staff ID를 반환한다", async () => {
    await expect(consumeStaffLoginCode("code", verifier)).resolves.toBe(7);
    expect(database.updateMany).toHaveBeenCalledWith({
      where: { id: 1, usedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { usedAt: expect.any(Date) },
    });

    database.updateMany.mockResolvedValue({ count: 0 });
    await expect(consumeStaffLoginCode("code", verifier)).resolves.toBeNull();
  });
});
