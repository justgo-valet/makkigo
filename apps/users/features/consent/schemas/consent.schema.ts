import { z } from "zod";

import { CONSENT_TYPES, REQUIRED_CONSENT_TYPES } from "@/libs/consent/contracts/consents";

const consentSchema = z.object({
  agreedTypes: z
    .array(z.enum(CONSENT_TYPES))
    .refine(
      (agreedTypes) => REQUIRED_CONSENT_TYPES.every((type) => agreedTypes.includes(type)),
      "필수 약관에 모두 동의해주세요.",
    ),
});
type ConsentFormValues = z.infer<typeof consentSchema>;

export { consentSchema };
export type { ConsentFormValues };
