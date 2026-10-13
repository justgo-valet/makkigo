import { z } from "zod";

import { onboardingSchema } from "@/features/onboarding/schemas/onboarding.schema";

const phoneNumberFormSchema = z.object({ value: onboardingSchema.shape.phoneNumber });
const vehicleNumberFormSchema = z.object({ value: onboardingSchema.shape.vehicleNumber });

type NumberFormValues = z.infer<typeof phoneNumberFormSchema>;

export { phoneNumberFormSchema, vehicleNumberFormSchema };
export type { NumberFormValues };
