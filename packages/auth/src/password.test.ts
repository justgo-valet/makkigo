import { describe, expect, it } from "vitest";

import { PasswordLoginError } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import { checkPasswordLogin, type UpdatePasswordAccounts } from "./password-login";

describe("password", () => {
  it("저장한 해시는 같은 비밀번호만 통과한다", async () => {
    const hash = await hashPassword("correct-horse");
    await expect(verifyPassword("correct-horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-horse", hash)).resolves.toBe(false);
  });

  it("5번 틀리면 맞는 비밀번호도 잠긴다", async () => {
    const row = { failedLoginCount: 0, lockedUntil: null as Date | null };
    const updateMany: UpdatePasswordAccounts = async ({ where, data }) => {
      const count = where.failedLoginCount;
      if (count && "lt" in count && row.failedLoginCount >= count.lt) return { count: 0 };
      if (count && "gte" in count && row.failedLoginCount < count.gte) return { count: 0 };
      if (where.OR && row.lockedUntil && row.lockedUntil > where.OR[1].lockedUntil.lte) return { count: 0 };
      row.failedLoginCount =
        typeof data.failedLoginCount === "number"
          ? data.failedLoginCount
          : row.failedLoginCount + data.failedLoginCount.increment;
      if (data.lockedUntil !== undefined) row.lockedUntil = data.lockedUntil;
      return { count: 1 };
    };
    const account = { id: 1, passwordHash: await hashPassword("correct-horse"), disabledAt: null };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await checkPasswordLogin(account, "wrong-horse", updateMany).catch(() => undefined);
    }

    await expect(checkPasswordLogin(account, "correct-horse", updateMany)).rejects.toEqual(
      new PasswordLoginError("LOCKED"),
    );
  });
});
