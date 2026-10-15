import { z } from "zod";

const WITHDRAW_ERROR_CODES = ["ACTIVE_VALET_SESSION"] as const;

const withdrawErrorResponseSchema = z.object({
  code: z.enum(WITHDRAW_ERROR_CODES),
});

type WithdrawErrorCode = (typeof WITHDRAW_ERROR_CODES)[number];

export { withdrawErrorResponseSchema };
export type { WithdrawErrorCode };
