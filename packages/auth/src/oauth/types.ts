import type { SocialProvider } from "database";

export interface SocialIdentity {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
}

export interface OAuthRequestContext {
  redirectUri: string;
  state: string;
  nonce: string;
}

export interface OAuthCallbackParams {
  code: string | null;
  idToken: string | null;
}

export interface OAuthProvider {
  buildAuthorizationUrl: (context: OAuthRequestContext) => string;
  identify: (params: OAuthCallbackParams, context: OAuthRequestContext) => Promise<SocialIdentity>;
}
