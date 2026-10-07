import { optionalEnv, requireEnv } from "../config";
import { buildUrl, getWithBearer, postForm, requireAccessToken, requireCode } from "./http";

import type { OAuthProvider } from "./types";

interface KakaoUser {
  id: number;
  kakao_account?: { email?: string; is_email_verified?: boolean };
}

export const kakao: OAuthProvider = {
  buildAuthorizationUrl: ({ redirectUri, state }) =>
    buildUrl("https://kauth.kakao.com/oauth/authorize", {
      client_id: requireEnv("KAKAO_REST_API_KEY"),
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    }),

  identify: async ({ code }, { redirectUri }) => {
    const clientSecret = optionalEnv("KAKAO_CLIENT_SECRET");
    const token = await postForm("https://kauth.kakao.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: requireEnv("KAKAO_REST_API_KEY"),
      redirect_uri: redirectUri,
      code: requireCode(code),
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    });
    const user = (await getWithBearer(
      "https://kapi.kakao.com/v2/user/me",
      requireAccessToken(token),
    )) as KakaoUser;
    const account = user.kakao_account;

    return {
      provider: "KAKAO",
      providerUserId: String(user.id),
      email: account?.is_email_verified && account.email ? account.email : null,
    };
  },
};
