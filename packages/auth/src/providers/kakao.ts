import { requireEnv } from "../config";
import { InvalidSocialTokenError } from "../errors";
import { fetchWithBearer } from "./http";

import type { SocialIdentity } from "./types";

interface KakaoTokenInfo {
  id: number;
  app_id: number;
}

interface KakaoUser {
  id: number;
  kakao_account?: { email?: string; is_email_verified?: boolean };
}

export const verifyKakaoToken = async (accessToken: string): Promise<SocialIdentity> => {
  const appId = requireEnv("KAKAO_APP_ID");

  const tokenInfo = (await fetchWithBearer(
    "https://kapi.kakao.com/v1/user/access_token_info",
    accessToken,
  )) as KakaoTokenInfo;

  if (String(tokenInfo.app_id) !== appId) {
    throw new InvalidSocialTokenError("다른 앱에서 발급된 카카오 토큰입니다.");
  }

  const user = (await fetchWithBearer(
    "https://kapi.kakao.com/v2/user/me",
    accessToken,
  )) as KakaoUser;
  const account = user.kakao_account;

  return {
    provider: "KAKAO",
    providerUserId: String(user.id),
    email: account?.is_email_verified && account.email ? account.email : null,
  };
};
