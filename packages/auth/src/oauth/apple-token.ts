import { SignJWT, importPKCS8 } from "jose";

import { optionalEnv } from "../config";
import { postForm } from "./http";

const APPLE_AUDIENCE = "https://appleid.apple.com";
const CLIENT_SECRET_TTL_SECONDS = 5 * 60;
const REQUEST_TIMEOUT_MS = 5000;

/** 웹 로그인 토큰은 Services ID, 앱 SDK 로그인 토큰은 번들 ID 로 발급된다. 교환 · 철회는 발급받은 ID 로 해야 한다. */
const readAppleClientConfig = (clientId: string | null) => {
  const teamId = optionalEnv("APPLE_TEAM_ID");
  const keyId = optionalEnv("APPLE_KEY_ID");
  const privateKey = optionalEnv("APPLE_PRIVATE_KEY");

  if (!clientId || !teamId || !keyId || !privateKey) return null;

  return { clientId, teamId, keyId, privateKey: privateKey.replace(/\\n/g, "\n") };
};

type AppleClientConfig = NonNullable<ReturnType<typeof readAppleClientConfig>>;

const createClientSecret = async ({ clientId, teamId, keyId, privateKey }: AppleClientConfig) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience(APPLE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${CLIENT_SECRET_TTL_SECONDS}s`)
    .sign(await importPKCS8(privateKey, "ES256"));

export const exchangeAppleCodeForRefreshToken = async (
  code: string,
  { clientId, redirectUri }: { clientId: string | null; redirectUri: string | null },
) => {
  const config = readAppleClientConfig(clientId);
  if (!config) return null;

  const body = (await postForm(`${APPLE_AUDIENCE}/auth/token`, {
    client_id: config.clientId,
    client_secret: await createClientSecret(config),
    grant_type: "authorization_code",
    code,
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  })) as { refresh_token?: unknown };

  return typeof body.refresh_token === "string" && body.refresh_token ? body.refresh_token : null;
};

/** `clientId` 가 없으면(이 칸이 생기기 전에 저장된 토큰) Services ID 로 철회한다. */
export const revokeAppleRefreshToken = async (refreshToken: string, clientId: string | null) => {
  const config = readAppleClientConfig(clientId ?? optionalEnv("APPLE_SERVICES_ID"));
  if (!config) return false;

  const response = await fetch(`${APPLE_AUDIENCE}/auth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: await createClientSecret(config),
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`애플 토큰 철회 실패: ${response.status}`);
  }

  return true;
};
