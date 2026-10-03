import { InvalidSocialTokenError } from "../errors";

const REQUEST_TIMEOUT_MS = 5000;

export const fetchWithBearer = async (url: string, accessToken: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status >= 400 && response.status < 500) {
    throw new InvalidSocialTokenError();
  }

  if (!response.ok) {
    throw new Error(`소셜 제공자 응답 오류: ${url} ${response.status}`);
  }

  return response.json();
};
