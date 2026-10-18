import { jwtVerify } from "jose";

import { SocialAuthError } from "../errors";

import type { createRemoteJWKSet, JWTPayload } from "jose";

export const verifyIdToken = async (
  idToken: string,
  jwks: ReturnType<typeof createRemoteJWKSet>,
  /** `nonce: null` 은 앱 SDK 로그인용. 구글 SDK 는 nonce 를 앱 시작 때 한 번만 정할 수 있어 로그인마다 맞춰 볼 수 없다. */
  options: { issuer: string | string[]; audience: string; nonce: string | null },
): Promise<JWTPayload & { sub: string }> => {
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: options.issuer,
      audience: options.audience,
    });

    if (!payload.sub || (options.nonce !== null && payload.nonce !== options.nonce)) {
      throw new SocialAuthError("ID 토큰의 사용자 또는 nonce 가 맞지 않습니다.");
    }

    return { ...payload, sub: payload.sub };
  } catch (error) {
    if (error instanceof SocialAuthError) throw error;
    throw new SocialAuthError("ID 토큰 검증에 실패했습니다.", { cause: error });
  }
};
