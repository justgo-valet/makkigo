import { z } from "zod";

const completeOnboardingRequestSchema = z.object({
  vehicleNumber: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{2,3}[가-힣]\d{4}$/)),
  phoneNumber: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^010\d{8}$/)),
  carBrand: z.string().trim().min(1).max(40),
  carModel: z.string().trim().min(1).max(60),
});

const ONBOARDING_ERROR_CODES = [
  "REQUIRED_CONSENTS_MISSING",
  "ALREADY_COMPLETED",
  "DUPLICATE_PHONE",
  "DUPLICATE_VEHICLE",
] as const;

const onboardingErrorResponseSchema = z.object({ code: z.enum(ONBOARDING_ERROR_CODES) });

type CompleteOnboardingRequest = z.infer<typeof completeOnboardingRequestSchema>;
type OnboardingErrorCode = (typeof ONBOARDING_ERROR_CODES)[number];

export { completeOnboardingRequestSchema, onboardingErrorResponseSchema };
export type { CompleteOnboardingRequest, OnboardingErrorCode };
