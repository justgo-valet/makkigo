import type { SocialProvider } from "database";

export interface SocialIdentity {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
}
