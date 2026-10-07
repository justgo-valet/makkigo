import { z } from "zod";

const phoneNumberSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^010\d{8}$/));

const completeOnboardingRequestSchema = z.object({
  vehicleNumber: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{2,3}[가-힣]\d{4}$/)),
  phoneNumber: phoneNumberSchema,
  carBrand: z.string().trim().min(1).max(40),
  carModel: z.string().trim().min(1).max(60),
});

const checkPhoneNumberRequestSchema = z.object({ phoneNumber: phoneNumberSchema });

const ONBOARDING_ERROR_CODES = [
  "REQUIRED_CONSENTS_MISSING",
  "ALREADY_COMPLETED",
  "DUPLICATE_PHONE",
  "DUPLICATE_VEHICLE",
] as const;

const onboardingErrorResponseSchema = z.object({ code: z.enum(ONBOARDING_ERROR_CODES) });

type CompleteOnboardingRequest = z.infer<typeof completeOnboardingRequestSchema>;
type CheckPhoneNumberRequest = z.infer<typeof checkPhoneNumberRequestSchema>;
type OnboardingErrorCode = (typeof ONBOARDING_ERROR_CODES)[number];

export {
  checkPhoneNumberRequestSchema,
  completeOnboardingRequestSchema,
  onboardingErrorResponseSchema,
};
export type { CheckPhoneNumberRequest, CompleteOnboardingRequest, OnboardingErrorCode };
