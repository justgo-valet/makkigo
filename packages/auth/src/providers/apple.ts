import { createRemoteJWKSet, jwtVerify } from "jose";

import { requireEnv } from "../config";
import { InvalidSocialTokenError } from "../errors";

import type { SocialIdentity } from "./types";

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export const verifyAppleToken = async (idToken: string): Promise<SocialIdentity> => {
  const bundleId = requireEnv("APPLE_BUNDLE_ID");

  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: bundleId,
    });

    if (!payload.sub) {
      throw new InvalidSocialTokenError();
    }

    const email = typeof payload.email === "string" ? payload.email : null;

    return { provider: "APPLE", providerUserId: payload.sub, email };
  } catch (error) {
    if (error instanceof InvalidSocialTokenError) throw error;
    throw new InvalidSocialTokenError(undefined, { cause: error });
  }
};
