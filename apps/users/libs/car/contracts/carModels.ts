import { z } from "zod";

const carModelsResponseSchema = z.array(z.string());

type CarModelsResponse = z.infer<typeof carModelsResponseSchema>;

export { carModelsResponseSchema };
export type { CarModelsResponse };
