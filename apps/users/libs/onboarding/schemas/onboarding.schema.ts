import { z } from "zod";

import { completeOnboardingRequestSchema } from "@/libs/onboarding/contracts/onboarding";

const onboardingSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(1, "차량 번호를 입력해주세요.")
    .refine(
      (value) => completeOnboardingRequestSchema.shape.vehicleNumber.safeParse(value).success,
      "12가3456 또는 123가4567 형식으로 입력해주세요.",
    ),
  phoneNumber: z
    .string()
    .trim()
    .refine(
      (value) => completeOnboardingRequestSchema.shape.phoneNumber.safeParse(value).success,
      "010-XXXX-XXXX 형식으로 입력해주세요.",
    ),
  carBrand: z.string().trim().min(1, "차량 브랜드를 선택해주세요."),
  carModel: z.string().trim().min(1, "차량 모델을 선택해주세요."),
});
type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export { onboardingSchema };
export type { OnboardingFormValues };
