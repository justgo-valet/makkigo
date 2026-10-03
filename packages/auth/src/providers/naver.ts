import { InvalidSocialTokenError } from "../errors";
import { fetchWithBearer } from "./http";

import type { SocialIdentity } from "./types";

interface NaverProfileResponse {
  resultcode: string;
  response?: { id?: string; email?: string };
}

export const verifyNaverToken = async (accessToken: string): Promise<SocialIdentity> => {
  const profile = (await fetchWithBearer(
    "https://openapi.naver.com/v1/nid/me",
    accessToken,
  )) as NaverProfileResponse;

  const id = profile.response?.id;

  if (profile.resultcode !== "00" || !id) {
    throw new InvalidSocialTokenError();
  }

  return { provider: "NAVER", providerUserId: id, email: profile.response?.email ?? null };
};
