import { SocialAuthError } from "../errors";

const REQUEST_TIMEOUT_MS = 5000;

export const buildUrl = (base: string, query: Record<string, string>) => {
  const url = new URL(base);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

const readJson = async (url: string, response: Response): Promise<unknown> => {
  if (response.status >= 400 && response.status < 500) {
    throw new SocialAuthError(`소셜 제공자가 요청을 거절했습니다: ${url} ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`소셜 제공자 응답 오류: ${url} ${response.status}`);
  }

  return response.json();
};

export const postForm = async (url: string, form: Record<string, string>) =>
  readJson(
    url,
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  );

export const getWithBearer = async (url: string, accessToken: string) =>
  readJson(
    url,
    await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  );

export const requireCode = (code: string | null) => {
  if (!code) {
    throw new SocialAuthError("인가 코드가 없습니다.");
  }

  return code;
};

export const requireAccessToken = (body: unknown) => {
  const accessToken = (body as { access_token?: unknown }).access_token;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new SocialAuthError("소셜 액세스 토큰을 받지 못했습니다.");
  }

  return accessToken;
};
