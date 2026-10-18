import { timingSafeEqual } from "node:crypto";

import { requireEnv } from "./config";
import { SocialAuthError } from "./errors";
import { oauthProviders } from "./oauth";
import { exchangeAppleCodeForRefreshToken } from "./oauth/apple-token";
import { identifyNativeLogin } from "./oauth/native";
import { readOAuthState, signOAuthState } from "./oauth/state";
import { createRandomToken } from "./tokens";
import { findOrCreateUserBySocialIdentity } from "./user-social-account";

import type { OAuthCallbackParams } from "./oauth";
import type { NativeLoginCredential } from "./oauth/native";
import type { OAuthClient } from "./oauth/state";
import type { ProviderToken } from "./user-social-account";
import type { SocialProvider } from "database";

const APP_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const isValidAppChallenge = (value: string) => APP_CHALLENGE_PATTERN.test(value);

export const startUserOAuth = async (input: {
  provider: SocialProvider;
  redirectUri: string;
  client: OAuthClient;
  appChallenge: string | null;
}) => {
  const nonce = createRandomToken();
  const csrf = createRandomToken();
  const state = await signOAuthState({
    provider: input.provider,
    nonce,
    csrf,
    client: input.client,
    appChallenge: input.appChallenge,
  });
  const authorizationUrl = oauthProviders[input.provider].buildAuthorizationUrl({
    redirectUri: input.redirectUri,
    state,
    nonce,
  });

  return { authorizationUrl, csrf };
};

export const readUserOAuthState = async (input: {
  provider: SocialProvider;
  state: string | null;
  csrf: string | null;
}) => {
  const state = input.state ? await readOAuthState(input.state) : null;

  if (!state || state.provider !== input.provider || !input.csrf) {
    return null;
  }

  const expected = Buffer.from(state.csrf);
  const actual = Buffer.from(input.csrf);

  return expected.length === actual.length && timingSafeEqual(expected, actual) ? state : null;
};

export const completeUserOAuth = async (input: {
  provider: SocialProvider;
  params: OAuthCallbackParams;
  state: string;
  nonce: string;
  redirectUri: string;
}) => {
  const identity = await oauthProviders[input.provider].identify(input.params, {
    redirectUri: input.redirectUri,
    state: input.state,
    nonce: input.nonce,
  });

  if (identity.provider !== input.provider) {
    throw new SocialAuthError();
  }

  const appleToken =
    identity.provider === "APPLE" && input.params.code
      ? await exchangeAppleToken(input.params.code, {
          clientId: requireEnv("APPLE_SERVICES_ID"),
          redirectUri: input.redirectUri,
        })
      : null;

  return findOrCreateUserBySocialIdentity(identity, appleToken);
};

/** 앱이 제공자 SDK 로 받은 값으로 로그인. 웹 OAuth 와 같은 회원을 찾거나 만든다. */
export const completeUserNativeLogin = async (input: {
  provider: SocialProvider;
  credential: NativeLoginCredential;
}) => {
  const identity = await identifyNativeLogin(input.provider, input.credential);
  const appleToken =
    identity.provider === "APPLE" && input.credential.authorizationCode
      ? await exchangeAppleToken(input.credential.authorizationCode, {
          clientId: requireEnv("APPLE_BUNDLE_ID"),
          redirectUri: null,
        })
      : null;

  return findOrCreateUserBySocialIdentity(identity, appleToken);
};

/** 탈퇴 때 철회할 애플 리프레시 토큰. 교환이 실패해도 로그인은 막지 않는다. */
const exchangeAppleToken = async (
  code: string,
  client: { clientId: string; redirectUri: string | null },
): Promise<ProviderToken | null> => {
  const refreshToken = await exchangeAppleCodeForRefreshToken(code, client).catch(
    (error: unknown) => {
      console.warn("Failed to exchange Apple authorization code", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return null;
    },
  );

  return refreshToken ? { refreshToken, clientId: client.clientId } : null;
};
