import { z } from "zod";

const CONSENT_TYPES = [
  "AGE_14_OR_OVER",
  "TERMS_OF_SERVICE",
  "PRIVACY_COLLECTION",
  "PRIVACY_THIRD_PARTY",
  "APP_PUSH",
  "ALIMTALK",
  "LOCATION_BASED_SERVICE",
] as const;

const REQUIRED_CONSENT_TYPES = [
  "AGE_14_OR_OVER",
  "TERMS_OF_SERVICE",
  "PRIVACY_COLLECTION",
  "PRIVACY_THIRD_PARTY",
] as const satisfies readonly (typeof CONSENT_TYPES)[number][];

const consentTypeSchema = z.enum(CONSENT_TYPES);

const isRequiredConsent = (type: ConsentType) =>
  (REQUIRED_CONSENT_TYPES as readonly ConsentType[]).includes(type);

const recordConsentsRequestSchema = z.object({
  documentVersion: z.string().trim().min(1).max(20),
  consents: z
    .array(z.object({ type: consentTypeSchema, agreed: z.boolean() }))
    .min(1)
    .refine((consents) => new Set(consents.map(({ type }) => type)).size === consents.length),
});

type ConsentType = z.infer<typeof consentTypeSchema>;
type RecordConsentsRequest = z.infer<typeof recordConsentsRequestSchema>;

export { CONSENT_TYPES, REQUIRED_CONSENT_TYPES, isRequiredConsent, recordConsentsRequestSchema };
export type { ConsentType, RecordConsentsRequest };
