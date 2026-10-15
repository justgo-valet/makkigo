import "server-only";

import { prisma } from "database";

import { getBoothManagerFailure } from "./boothManager";

import type { BoothManagerFailure } from "./boothManager";
import type {
  BankAccountSettings,
  FeePolicySettings,
  PaymentSettings,
} from "@/libs/booth/contracts/payment-settings";
import type { Prisma } from "database";

const findCurrentSettings = async (client: Prisma.TransactionClient, boothId: number, now: Date) => {
  const current = {
    where: { boothId, effectiveFrom: { lte: now } },
    orderBy: [{ effectiveFrom: "desc" as const }, { id: "desc" as const }],
  };
  const [feePolicy, bankAccount] = await Promise.all([
    client.boothFeePolicy.findFirst({
      ...current,
      select: { baseMinutes: true, baseFee: true, extraUnitMinutes: true, extraUnitFee: true },
    }),
    client.boothBankAccount.findFirst({
      ...current,
      select: { bankName: true, accountNumber: true, accountHolder: true },
    }),
  ]);

  return { feePolicy, bankAccount };
};

const sameFeePolicy = (left: FeePolicySettings | null, right: FeePolicySettings) =>
  left?.baseMinutes === right.baseMinutes &&
  left.baseFee === right.baseFee &&
  left.extraUnitMinutes === right.extraUnitMinutes &&
  left.extraUnitFee === right.extraUnitFee;

const sameBankAccount = (left: BankAccountSettings | null, right: BankAccountSettings) =>
  left?.bankName === right.bankName &&
  left.accountNumber === right.accountNumber &&
  left.accountHolder === right.accountHolder;

type GetPaymentSettingsResult =
  | {
      ok: true;
      value: { feePolicy: FeePolicySettings | null; bankAccount: BankAccountSettings | null };
    }
  | { ok: false; reason: BoothManagerFailure };

const getPaymentSettings = async (
  staffId: number,
  boothId: number,
  now = new Date(),
): Promise<GetPaymentSettingsResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  return { ok: true, value: await findCurrentSettings(prisma, boothId, now) };
};

type SavePaymentSettingsResult = { ok: true } | { ok: false; reason: BoothManagerFailure };

const savePaymentSettings = async (
  staffId: number,
  boothId: number,
  { feePolicy, bankAccount }: PaymentSettings,
  savedAt?: Date,
): Promise<SavePaymentSettingsResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  await prisma.$transaction(async (tx) => {
    const now = savedAt ?? new Date();
    const current = await findCurrentSettings(tx, boothId, now);

    if (!sameFeePolicy(current.feePolicy, feePolicy)) {
      await tx.boothFeePolicy.create({ data: { boothId, ...feePolicy, effectiveFrom: now } });
    }
    if (!sameBankAccount(current.bankAccount, bankAccount)) {
      await tx.boothBankAccount.create({ data: { boothId, ...bankAccount, effectiveFrom: now } });
    }
  });

  return { ok: true };
};

export { getPaymentSettings, savePaymentSettings };
