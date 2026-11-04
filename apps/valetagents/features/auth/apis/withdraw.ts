import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import { withdrawErrorResponseSchema } from "@/libs/auth/contracts/withdraw";

import type { WithdrawErrorCode } from "@/libs/auth/contracts/withdraw";

const withdraw = async () => {
  await apiClient.delete("staff/me");
};

const getWithdrawErrorCode = (error: unknown): WithdrawErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = withdrawErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { getWithdrawErrorCode, withdraw };
