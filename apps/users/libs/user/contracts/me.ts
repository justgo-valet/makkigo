import { z } from "zod";

const meResponseSchema = z.object({
  requiredConsentsAgreed: z.boolean(),
  onboardingCompleted: z.boolean(),
});

type MeResponse = z.infer<typeof meResponseSchema>;

export { meResponseSchema };
export type { MeResponse };
