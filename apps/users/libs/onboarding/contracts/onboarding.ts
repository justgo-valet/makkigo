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

type CompleteOnboardingRequest = z.infer<typeof completeOnboardingRequestSchema>;

export { completeOnboardingRequestSchema };
export type { CompleteOnboardingRequest };
