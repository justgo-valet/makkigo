import { requireEnv } from "../config";
import { SocialAuthError } from "../errors";
import { APPLE_JWKS } from "./apple";
import { GOOGLE_JWKS } from "./google";
import { getWithBearer } from "./http";
import { verifyIdToken } from "./id-token";
import { identifyKakaoUser } from "./kakao";

import type { SocialIdentity } from "./types";
import type { SocialProvider } from "database";

/** 앱이 제공자 SDK 로 로그인하고 웹에 넘겨준 값. 카카오는 액세스 토큰, 구글 · 애플은 ID 토큰(+ 애플 인가 코드). */
export interface NativeLoginCredential {
  accessToken?: string;
  idToken?: string;
  authorizationCode?: string;
}

const requireValue = (value: string | undefined, name: string) => {
  if (!value) {
    throw new SocialAuthError(`${name} 이 없습니다.`);
  }

  return value;
};

/** 다른 카카오 앱에서 받은 토큰을 내밀어도 로그인되지 않도록 우리 앱(`KAKAO_APP_ID`)에 발급된 토큰인지 먼저 본다. */
const identifyKakao = async ({ accessToken }: NativeLoginCredential) => {
  const token = requireValue(accessToken, "카카오 액세스 토큰");
  const info = (await getWithBearer("https://kapi.kakao.com/v1/user/access_token_info", token)) as {
    app_id?: unknown;
  };

  if (String(info.app_id) !== requireEnv("KAKAO_APP_ID")) {
    throw new SocialAuthError("우리 앱에 발급된 카카오 토큰이 아닙니다.");
  }

  return identifyKakaoUser(token);
};

/** 구글 SDK 는 `serverClientId` 로 웹 클라이언트 ID 를 넘기므로 ID 토큰의 `aud` 가 웹 로그인과 같은 `GOOGLE_CLIENT_ID` 다. */
const identifyGoogle = async ({ idToken }: NativeLoginCredential): Promise<SocialIdentity> => {
  const payload = await verifyIdToken(requireValue(idToken, "구글 ID 토큰"), GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: requireEnv("GOOGLE_CLIENT_ID"),
    nonce: null,
  });
  const email = typeof payload.email === "string" && payload.email_verified ? payload.email : null;

  return { provider: "GOOGLE", providerUserId: payload.sub, email };
};

/** 앱의 Sign in with Apple 은 `aud` 가 Services ID 가 아니라 앱 번들 ID(`APPLE_BUNDLE_ID`)다. */
const identifyApple = async ({ idToken }: NativeLoginCredential): Promise<SocialIdentity> => {
  const payload = await verifyIdToken(requireValue(idToken, "애플 ID 토큰"), APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: requireEnv("APPLE_BUNDLE_ID"),
    nonce: null,
  });
  const email = typeof payload.email === "string" ? payload.email : null;

  return { provider: "APPLE", providerUserId: payload.sub, email };
};

export const identifyNativeLogin = (
  provider: SocialProvider,
  credential: NativeLoginCredential,
): Promise<SocialIdentity> => {
  switch (provider) {
    case "KAKAO":
      return identifyKakao(credential);
    case "GOOGLE":
      return identifyGoogle(credential);
    case "APPLE":
      return identifyApple(credential);
  }
};
