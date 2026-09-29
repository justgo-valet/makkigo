import { z } from "zod";

const onboardingSchema = z.object({
  vehicleNumber: z.string().trim().min(1, "차량 번호를 입력해주세요."),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^010-\d{4}-\d{4}$/, "010-XXXX-XXXX 형식으로 입력해주세요."),
  carBrand: z.string().trim().min(1, "차량 브랜드를 입력해주세요."),
  carModel: z.string().trim().min(1, "차량 모델을 입력해주세요."),
});
type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export { onboardingSchema };
export type { OnboardingFormValues };
