import { PasswordLoginError } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import { PASSWORD_MAX_LENGTH } from "./password-policy";
import { createRandomToken } from "./tokens";

export const MAX_FAILED_LOGINS = 5;
export const LOGIN_LOCK_SECONDS = 15 * 60;

interface PasswordAccount {
  id: number;
  passwordHash: string;
  disabledAt: Date | null;
}

interface AttemptWhere {
  id: number;
  failedLoginCount?: { lt: number } | { gte: number };
  OR?: [{ lockedUntil: null }, { lockedUntil: { lte: Date } }];
}

interface AttemptData {
  failedLoginCount: number | { increment: number };
  lockedUntil?: Date | null;
}

export type UpdatePasswordAccounts = (args: {
  where: AttemptWhere;
  data: AttemptData;
}) => Promise<{ count: number }>;

let dummyHash: Promise<string> | undefined;

export const checkPasswordLogin = async <Account extends PasswordAccount>(
  account: Account | null,
  password: string,
  updateMany: UpdatePasswordAccounts,
): Promise<Account> => {
  if (!account || password.length > PASSWORD_MAX_LENGTH) {
    dummyHash ??= hashPassword(createRandomToken());
    await verifyPassword(password.slice(0, PASSWORD_MAX_LENGTH), await dummyHash);
    throw new PasswordLoginError("INVALID_CREDENTIALS");
  }
  const now = new Date();
  const lockIfExhausted = () =>
    updateMany({
      where: { id: account.id, failedLoginCount: { gte: MAX_FAILED_LOGINS } },
      data: { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_SECONDS * 1000) },
    });
  const reserved = await updateMany({
    where: {
      id: account.id,
      failedLoginCount: { lt: MAX_FAILED_LOGINS },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    data: { failedLoginCount: { increment: 1 } },
  });
  if (reserved.count === 0) {
    await lockIfExhausted();
    throw new PasswordLoginError("LOCKED");
  }
  if (!(await verifyPassword(password, account.passwordHash))) {
    const locked = await lockIfExhausted();
    throw new PasswordLoginError(locked.count > 0 ? "LOCKED" : "INVALID_CREDENTIALS");
  }
  await updateMany({ where: { id: account.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  if (account.disabledAt) throw new PasswordLoginError("DISABLED");
  return account;
};
