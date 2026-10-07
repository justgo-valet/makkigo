import { apple } from "./apple";
import { google } from "./google";
import { kakao } from "./kakao";
import { naver } from "./naver";

import type { OAuthProvider } from "./types";
import type { SocialProvider } from "database";

export const oauthProviders: Record<SocialProvider, OAuthProvider> = {
  KAKAO: kakao,
  GOOGLE: google,
  APPLE: apple,
  NAVER: naver,
};

const PROVIDER_BY_PATH: Record<string, SocialProvider> = {
  kakao: "KAKAO",
  google: "GOOGLE",
  apple: "APPLE",
  naver: "NAVER",
};

export const parseSocialProvider = (value: string): SocialProvider | null =>
  PROVIDER_BY_PATH[value.toLowerCase()] ?? null;

export type { OAuthCallbackParams, SocialIdentity } from "./types";
