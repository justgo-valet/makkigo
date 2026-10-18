import { z } from "zod";

const SOCIAL_PROVIDERS = ["KAKAO", "GOOGLE", "APPLE"] as const;

const profileResponseSchema = z.object({
  phoneNumber: z.string().nullable(),
  plateNumber: z.string().nullable(),
  socialAccounts: z.array(
    z.object({
      provider: z.enum(SOCIAL_PROVIDERS),
      email: z.string().nullable(),
    }),
  ),
  consents: z.object({
    locationBasedService: z.boolean(),
  }),
});

type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
type ProfileResponse = z.infer<typeof profileResponseSchema>;

export { profileResponseSchema, SOCIAL_PROVIDERS };
export type { ProfileResponse, SocialProvider };
