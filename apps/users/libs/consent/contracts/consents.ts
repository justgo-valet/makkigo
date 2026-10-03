import { z } from "zod";

const CONSENT_TYPES = [
  "TERMS_OF_SERVICE",
  "PRIVACY_COLLECTION",
  "PRIVACY_OVERSEAS_TRANSFER",
  "APP_PUSH",
  "ALIMTALK",
] as const;

const REQUIRED_CONSENT_TYPES = [
  "TERMS_OF_SERVICE",
  "PRIVACY_COLLECTION",
  "PRIVACY_OVERSEAS_TRANSFER",
] as const satisfies readonly (typeof CONSENT_TYPES)[number][];

const consentTypeSchema = z.enum(CONSENT_TYPES);

const recordConsentsRequestSchema = z.object({
  documentVersion: z.string().trim().min(1).max(20),
  consents: z
    .array(z.object({ type: consentTypeSchema, agreed: z.boolean() }))
    .min(1)
    .refine((consents) => new Set(consents.map(({ type }) => type)).size === consents.length),
});

type ConsentType = z.infer<typeof consentTypeSchema>;
type RecordConsentsRequest = z.infer<typeof recordConsentsRequestSchema>;

export { CONSENT_TYPES, REQUIRED_CONSENT_TYPES, recordConsentsRequestSchema };
export type { ConsentType, RecordConsentsRequest };
