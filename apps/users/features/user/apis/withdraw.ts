import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import { withdrawErrorResponseSchema } from "@/libs/user/contracts/withdraw";

import type { WithdrawErrorCode } from "@/libs/user/contracts/withdraw";

const withdraw = async () => {
  await apiClient.delete("users/me");
};

const getWithdrawErrorCode = (error: unknown): WithdrawErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = withdrawErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { getWithdrawErrorCode, withdraw };
