import { createRemoteJWKSet } from "jose";

import { requireEnv } from "../config";
import { SocialAuthError } from "../errors";
import { buildUrl } from "./http";
import { verifyIdToken } from "./id-token";

import type { OAuthProvider } from "./types";

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export const apple: OAuthProvider = {
  buildAuthorizationUrl: ({ redirectUri, state, nonce }) =>
    buildUrl("https://appleid.apple.com/auth/authorize", {
      client_id: requireEnv("APPLE_SERVICES_ID"),
      redirect_uri: redirectUri,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: "email",
      state,
      nonce,
    }),

  identify: async ({ idToken }, { nonce }) => {
    if (!idToken) {
      throw new SocialAuthError("애플 ID 토큰이 없습니다.");
    }

    const payload = await verifyIdToken(idToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: requireEnv("APPLE_SERVICES_ID"),
      nonce,
    });
    const email = typeof payload.email === "string" ? payload.email : null;

    return { provider: "APPLE", providerUserId: payload.sub, email };
  },
};
