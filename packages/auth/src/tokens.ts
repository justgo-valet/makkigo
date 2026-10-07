import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { ACCESS_TOKEN_TTL_SECONDS, getJwtSecret, REFRESH_TOKEN_TTL_SECONDS } from "./config";

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
  const secret = getJwtSecret();
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

export const verifyAccessToken = async (
  audience: AuthAudience,
  token: string,
): Promise<number | null> => {
  const secret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience,
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    const subjectId = Number(payload.sub);

    return Number.isSafeInteger(subjectId) ? subjectId : null;
  } catch {
    return null;
  }
};

export const createRandomToken = () => randomBytes(32).toString("base64url");

export const createRefreshToken = (): IssuedToken => ({
  token: createRandomToken(),
  expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
});

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashBase64Url = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
