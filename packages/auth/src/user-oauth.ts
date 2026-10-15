import { timingSafeEqual } from "node:crypto";

import { SocialAuthError } from "./errors";
import { oauthProviders } from "./oauth";
import { exchangeAppleCodeForRefreshToken } from "./oauth/apple-token";
import { readOAuthState, signOAuthState } from "./oauth/state";
import { createRandomToken } from "./tokens";
import { findOrCreateUserBySocialIdentity } from "./user-social-account";

import type { OAuthCallbackParams } from "./oauth";
import type { OAuthClient } from "./oauth/state";
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

  const providerRefreshToken =
    identity.provider === "APPLE" && input.params.code
      ? await exchangeAppleCodeForRefreshToken(input.params.code, input.redirectUri).catch(
          (error: unknown) => {
            console.warn("Failed to exchange Apple authorization code", {
              errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return null;
          },
        )
      : null;

  return findOrCreateUserBySocialIdentity(identity, providerRefreshToken);
};
