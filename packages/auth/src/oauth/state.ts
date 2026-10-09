import { jwtVerify, SignJWT } from "jose";

import { getJwtSecret, OAUTH_STATE_TTL_SECONDS } from "../config";

import type { SocialProvider } from "database";

const STATE_AUDIENCE = "users-oauth-state";
const ISSUER = "makkigo";

export type OAuthClient = "web" | "app";

export interface OAuthState {
  provider: SocialProvider;
  nonce: string;
  csrf: string;
  client: OAuthClient;
  appChallenge: string | null;
}

export const signOAuthState = (state: OAuthState) =>
  new SignJWT({ ...state })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(STATE_AUDIENCE)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
    .sign(getJwtSecret());

export const readOAuthState = async (token: string): Promise<OAuthState | null> => {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      audience: STATE_AUDIENCE,
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    const { provider, nonce, csrf, client, appChallenge } = payload as Partial<OAuthState>;

    if (!provider || !nonce || !csrf || (client !== "web" && client !== "app")) {
      return null;
    }

    return { provider, nonce, csrf, client, appChallenge: appChallenge ?? null };
  } catch {
    return null;
  }
};
