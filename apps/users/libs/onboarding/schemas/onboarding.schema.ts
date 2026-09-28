import { z } from "zod";

const onboardingSchema = z.object({
  vehicleNumber: z.string().trim().min(1, "차량 번호를 입력해주세요."),
  phoneNumber: z.string().trim().min(1, "휴대전화 번호를 입력해주세요."),
  carBrand: z.string().trim().min(1, "차량 브랜드를 입력해주세요."),
  carModel: z.string().trim().min(1, "차량 모델을 입력해주세요."),
});

export { onboardingSchema };
