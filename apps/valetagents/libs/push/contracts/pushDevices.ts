import { z } from "zod";

const installationSecretSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const pushDeviceRequestSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  platform: z.enum(["IOS", "ANDROID"]),
  installationSecret: installationSecretSchema,
});
const pushDeviceCleanupRequestSchema = z.object({
  hasPushDevice: z.boolean(),
  installationSecret: installationSecretSchema.optional(),
});

type PushDeviceRequest = z.infer<typeof pushDeviceRequestSchema>;
type PushDeviceCleanupRequest = z.infer<typeof pushDeviceCleanupRequestSchema>;

export { pushDeviceCleanupRequestSchema, pushDeviceRequestSchema };
export type { PushDeviceCleanupRequest, PushDeviceRequest };
