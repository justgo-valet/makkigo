import { z } from "zod";

const carBrandsResponseSchema = z.array(z.object({ name: z.string(), logoUrl: z.url() }));

type CarBrandsResponse = z.infer<typeof carBrandsResponseSchema>;

export { carBrandsResponseSchema };
export type { CarBrandsResponse };
