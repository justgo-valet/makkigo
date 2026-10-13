import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import {
  updatePhoneNumberErrorResponseSchema,
  updatePhoneNumberRequestSchema,
} from "@/libs/user/contracts/phoneNumber";

import type { UpdatePhoneNumberErrorCode } from "@/libs/user/contracts/phoneNumber";

const updatePhoneNumber = async (phoneNumber: string) => {
  await apiClient.patch("users/me/phone-number", {
    json: updatePhoneNumberRequestSchema.parse({ phoneNumber }),
  });
};

const getUpdatePhoneNumberErrorCode = (error: unknown): UpdatePhoneNumberErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = updatePhoneNumberErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { getUpdatePhoneNumberErrorCode, updatePhoneNumber };
