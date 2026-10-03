import { z } from "zod";

const socialLoginRequestSchema = z.object({
  token: z.string().trim().min(1),
});

const socialLoginResponseSchema = z.object({
  isNewUser: z.boolean(),
});

type SocialLoginRequest = z.infer<typeof socialLoginRequestSchema>;
type SocialLoginResponse = z.infer<typeof socialLoginResponseSchema>;

export { socialLoginRequestSchema, socialLoginResponseSchema };
export type { SocialLoginRequest, SocialLoginResponse };
