import { z } from "zod";

const pushDeviceRequestSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  platform: z.enum(["IOS", "ANDROID"]),
});

const removePushDeviceRequestSchema = pushDeviceRequestSchema.pick({ token: true });

type PushDeviceRequest = z.infer<typeof pushDeviceRequestSchema>;
type RemovePushDeviceRequest = z.infer<typeof removePushDeviceRequestSchema>;

export { pushDeviceRequestSchema, removePushDeviceRequestSchema };
export type { PushDeviceRequest, RemovePushDeviceRequest };
