import { z } from "zod";

const BOOTH_NAME_MAX_LENGTH = 50;
const BOOTH_ADDRESS_MAX_LENGTH = 200;
const BOOTH_ADDRESS_DETAIL_MAX_LENGTH = 100;

const createBoothBodySchema = z
  .object({
    name: z.string().trim().min(1).max(BOOTH_NAME_MAX_LENGTH),
    address: z.string().trim().min(1).max(BOOTH_ADDRESS_MAX_LENGTH),
    addressDetail: z
      .string()
      .trim()
      .max(BOOTH_ADDRESS_DETAIL_MAX_LENGTH)
      .optional()
      .transform((value) => value || null),
  })
  .strict();

const createBoothResponseSchema = z.object({ id: z.number().int().positive() });

export {
  BOOTH_ADDRESS_DETAIL_MAX_LENGTH,
  BOOTH_ADDRESS_MAX_LENGTH,
  BOOTH_NAME_MAX_LENGTH,
  createBoothBodySchema,
  createBoothResponseSchema,
};
export type CreateBoothBody = z.infer<typeof createBoothBodySchema>;
export type CreateBoothInput = z.input<typeof createBoothBodySchema>;
export type CreateBoothResponse = z.infer<typeof createBoothResponseSchema>;
