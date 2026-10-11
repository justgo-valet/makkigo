import { z } from "zod";

import { requestSummarySchema } from "@/libs/booth/contracts/agent-request";

const staffRoleSchema = z.enum(["VALET_AGENT", "MERCHANT_ADMIN"]);
const onboardingStateSchema = z.enum([
  "ROLE_REQUIRED",
  "BOOTH_REQUIRED",
  "AWAITING_APPROVAL",
  "COMPLETE",
]);

const onboardingStatusResponseSchema = z.object({
  role: staffRoleSchema.nullable(),
  state: onboardingStateSchema,
  nextPath: z.enum(["/onboarding", "/"]),
  requests: z.array(requestSummarySchema),
});

export { onboardingStateSchema, onboardingStatusResponseSchema, staffRoleSchema };
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type OnboardingStatusResponse = z.infer<typeof onboardingStatusResponseSchema>;
export type StaffRole = z.infer<typeof staffRoleSchema>;
