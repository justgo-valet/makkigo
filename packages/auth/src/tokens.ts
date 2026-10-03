import { createHash, randomBytes } from "node:crypto";

import { SignJWT } from "jose";

import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, requireEnv } from "./config";

export type AuthAudience = "users";

const ISSUER = "makkigo";

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export const createAccessToken = async (
  audience: AuthAudience,
  subjectId: number,
): Promise<IssuedToken> => {
  const secret = new TextEncoder().encode(requireEnv("AUTH_JWT_SECRET"));
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(subjectId))
    .setAudience(audience)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return { token, expiresAt };
};

export const createRefreshToken = (): IssuedToken => ({
  token: randomBytes(32).toString("base64url"),
  expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
});

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
