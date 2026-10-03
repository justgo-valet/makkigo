import { verifyAppleToken } from "./apple";
import { verifyGoogleToken } from "./google";
import { verifyKakaoToken } from "./kakao";
import { verifyNaverToken } from "./naver";

import type { SocialIdentity } from "./types";
import type { SocialProvider } from "database";

const verifiers: Record<SocialProvider, (token: string) => Promise<SocialIdentity>> = {
  KAKAO: verifyKakaoToken,
  GOOGLE: verifyGoogleToken,
  APPLE: verifyAppleToken,
  NAVER: verifyNaverToken,
};

const PROVIDER_BY_PATH: Record<string, SocialProvider> = {
  kakao: "KAKAO",
  google: "GOOGLE",
  apple: "APPLE",
  naver: "NAVER",
};

export const parseSocialProvider = (value: string): SocialProvider | null =>
  PROVIDER_BY_PATH[value.toLowerCase()] ?? null;

export const verifySocialToken = (provider: SocialProvider, token: string) =>
  verifiers[provider](token);

export type { SocialIdentity };
