import { requireEnv } from "../config";
import { SocialAuthError } from "../errors";
import { buildUrl, getWithBearer, postForm, requireAccessToken, requireCode } from "./http";

import type { OAuthProvider } from "./types";

interface NaverProfileResponse {
  resultcode: string;
  response?: { id?: string; email?: string };
}

export const naver: OAuthProvider = {
  buildAuthorizationUrl: ({ redirectUri, state }) =>
    buildUrl("https://nid.naver.com/oauth2.0/authorize", {
      client_id: requireEnv("NAVER_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    }),

  identify: async ({ code }, { state }) => {
    const token = await postForm("https://nid.naver.com/oauth2.0/token", {
      grant_type: "authorization_code",
      client_id: requireEnv("NAVER_CLIENT_ID"),
      client_secret: requireEnv("NAVER_CLIENT_SECRET"),
      code: requireCode(code),
      state,
    });
    const profile = (await getWithBearer(
      "https://openapi.naver.com/v1/nid/me",
      requireAccessToken(token),
    )) as NaverProfileResponse;
    const id = profile.response?.id;

    if (profile.resultcode !== "00" || !id) {
      throw new SocialAuthError("네이버 프로필을 받지 못했습니다.");
    }

    return { provider: "NAVER", providerUserId: id, email: profile.response?.email ?? null };
  },
};
