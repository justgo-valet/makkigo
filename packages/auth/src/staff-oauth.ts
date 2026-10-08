import { timingSafeEqual } from "node:crypto";

import { SocialAuthError } from "./errors";
import { oauthProviders } from "./oauth";
import { readOAuthState, signOAuthState } from "./oauth/state";
import { findOrCreateStaffBySocialIdentity } from "./staff-social-account";
import { createRandomToken } from "./tokens";

import type { OAuthCallbackParams } from "./oauth";
import type { OAuthClient } from "./oauth/state";
import type { SocialProvider } from "database";

export const startStaffOAuth = async (input: {
  provider: SocialProvider;
  redirectUri: string;
  client: OAuthClient;
  appChallenge: string | null;
}) => {
  const nonce = createRandomToken();
  const csrf = createRandomToken();
  const state = await signOAuthState({ ...input, nonce, csrf });
  const authorizationUrl = oauthProviders[input.provider].buildAuthorizationUrl({
    redirectUri: input.redirectUri,
    state,
    nonce,
  });
  return { authorizationUrl, csrf };
};

export const readStaffOAuthState = async (input: {
  provider: SocialProvider;
  state: string | null;
  csrf: string | null;
}) => {
  const state = input.state ? await readOAuthState(input.state) : null;
  if (!state || state.provider !== input.provider || !input.csrf) return null;

  const expected = Buffer.from(state.csrf);
  const actual = Buffer.from(input.csrf);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? state : null;
};

export const completeStaffOAuth = async (input: {
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
  if (identity.provider !== input.provider) throw new SocialAuthError();
  return findOrCreateStaffBySocialIdentity(identity);
};
