import { z } from "zod";

const merchantImportTargetBodySchema = z
  .object({
    signguCode: z.string().regex(/^\d{5}$/),
    signguName: z.string().trim().min(1).max(50),
    industries: z
      .array(z.object({ code: z.string().regex(/^[A-Z0-9]{4}$/), name: z.string().trim().min(1).max(50) }).strict())
      .min(1)
      .max(50)
      .refine((industries) => new Set(industries.map(({ code }) => code)).size === industries.length),
  })
  .strict();

interface IndustryCategory {
  code: string;
  name: string;
}

interface SignguRegion {
  code: string;
  name: string;
}

export { merchantImportTargetBodySchema };
export type MerchantImportTargetBody = z.input<typeof merchantImportTargetBodySchema>;
export type { IndustryCategory, SignguRegion };
