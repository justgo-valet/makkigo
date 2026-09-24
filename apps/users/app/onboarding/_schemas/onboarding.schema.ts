import z from "zod";

export const onboardingInputSchema = z.object({
  vehicleNumber: z.string(),
  phoneNumber: z.string(),
});
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
