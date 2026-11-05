import { z } from "zod";

const MAX_VALET_FEE = 10_000_000;

const valetFeeUpdateSchema = z.object({ fee: z.number().int().min(0).max(MAX_VALET_FEE) }).strict();

export { MAX_VALET_FEE, valetFeeUpdateSchema };
export type ValetFeeUpdate = z.infer<typeof valetFeeUpdateSchema>;
