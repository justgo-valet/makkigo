import type { SocialProvider } from "database";

export interface SocialIdentity {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
}

/** 탈퇴 때 철회하려고 저장하는 제공자 리프레시 토큰과, 그 토큰을 발급받은 클라이언트 ID (지금은 애플만). */
export interface ProviderToken {
  refreshToken: string;
  clientId: string;
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
