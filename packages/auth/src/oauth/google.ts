import { createRemoteJWKSet } from "jose";

import { requireEnv } from "../config";
import { SocialAuthError } from "../errors";
import { buildUrl, postForm, requireCode } from "./http";
import { verifyIdToken } from "./id-token";

import type { OAuthProvider } from "./types";

export const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const google: OAuthProvider = {
  buildAuthorizationUrl: ({ redirectUri, state, nonce }) =>
    buildUrl("https://accounts.google.com/o/oauth2/v2/auth", {
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email",
      prompt: "select_account",
      state,
      nonce,
    }),

  identify: async ({ code }, { redirectUri, nonce }) => {
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const token = (await postForm("https://oauth2.googleapis.com/token", {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      code: requireCode(code),
    })) as { id_token?: unknown };

    if (typeof token.id_token !== "string") {
      throw new SocialAuthError("구글 ID 토큰을 받지 못했습니다.");
    }

    const payload = await verifyIdToken(token.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
      nonce,
    });
    const email =
      typeof payload.email === "string" && payload.email_verified ? payload.email : null;

    return { provider: "GOOGLE", providerUserId: payload.sub, email };
  },
};
