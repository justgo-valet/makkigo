import { createRemoteJWKSet, jwtVerify } from "jose";

import { requireEnv } from "../config";
import { InvalidSocialTokenError } from "../errors";

import type { SocialIdentity } from "./types";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const verifyGoogleToken = async (idToken: string): Promise<SocialIdentity> => {
  const audience = [requireEnv("GOOGLE_IOS_CLIENT_ID"), requireEnv("GOOGLE_ANDROID_CLIENT_ID")];

  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });

    if (!payload.sub) {
      throw new InvalidSocialTokenError();
    }

    const email =
      typeof payload.email === "string" && payload.email_verified ? payload.email : null;

    return { provider: "GOOGLE", providerUserId: payload.sub, email };
  } catch (error) {
    if (error instanceof InvalidSocialTokenError) throw error;
    throw new InvalidSocialTokenError(undefined, { cause: error });
  }
};
