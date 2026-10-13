import { z } from "zod";

import { checkPhoneNumberRequestSchema } from "@/libs/onboarding/contracts/onboarding";

const updatePhoneNumberRequestSchema = checkPhoneNumberRequestSchema;

const UPDATE_PHONE_NUMBER_ERROR_CODES = ["DUPLICATE_PHONE"] as const;

const updatePhoneNumberErrorResponseSchema = z.object({
  code: z.enum(UPDATE_PHONE_NUMBER_ERROR_CODES),
});

type UpdatePhoneNumberRequest = z.infer<typeof updatePhoneNumberRequestSchema>;
type UpdatePhoneNumberErrorCode = (typeof UPDATE_PHONE_NUMBER_ERROR_CODES)[number];

export { updatePhoneNumberErrorResponseSchema, updatePhoneNumberRequestSchema };
export type { UpdatePhoneNumberErrorCode, UpdatePhoneNumberRequest };
