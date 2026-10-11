import { z } from "zod";

const myVehicleResponseSchema = z.object({
  plateNumber: z.string(),
  carImageUrl: z.url(),
});

type MyVehicleResponse = z.infer<typeof myVehicleResponseSchema>;

export { myVehicleResponseSchema };
export type { MyVehicleResponse };
