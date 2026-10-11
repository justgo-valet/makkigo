import { z } from "zod";

const vehicleSchema = z.object({
  id: z.number().int().positive(),
  plateNumber: z.string(),
  brand: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      logoUrl: z.url(),
    })
    .nullable(),
  model: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      imageUrl: z.url(),
    })
    .nullable(),
  customBrandName: z.string().nullable(),
  customModelName: z.string().nullable(),
  carImageUrl: z.url(),
});

type Vehicle = z.infer<typeof vehicleSchema>;

const vehicleResponseSchema = z.array(vehicleSchema);
type VehicleResponse = z.infer<typeof vehicleResponseSchema>;

export { vehicleSchema, vehicleResponseSchema };
export type { Vehicle, VehicleResponse };
