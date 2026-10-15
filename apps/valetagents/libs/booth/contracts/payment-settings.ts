import { z } from "zod";

const MAX_FEE = 1_000_000;

const feePolicySchema = z
  .object({
    baseMinutes: z.number().int().min(60).max(1440).multipleOf(60),
    baseFee: z.number().int().min(0).max(MAX_FEE),
    extraUnitMinutes: z.number().int().min(1).max(180),
    extraUnitFee: z.number().int().min(0).max(MAX_FEE),
  })
  .strict();

const bankAccountSchema = z
  .object({
    bankName: z.string().trim().min(1).max(20),
    accountNumber: z.string().trim().max(30).regex(/^\d+(?:-\d+)*$/),
    accountHolder: z.string().trim().min(1).max(30),
  })
  .strict();

const paymentSettingsSchema = z
  .object({ feePolicy: feePolicySchema, bankAccount: bankAccountSchema })
  .strict();

export { MAX_FEE, bankAccountSchema, feePolicySchema, paymentSettingsSchema };
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export type FeePolicySettings = z.infer<typeof feePolicySchema>;
export type BankAccountSettings = z.infer<typeof bankAccountSchema>;
