import {
  AuthConfigError,
  completeUserOAuth,
  createUserLoginCode,
  issueUserTokens,
  parseSocialProvider,
  readUserOAuthState,
  SocialAuthError,
} from "@makkigo/auth";
import { NextResponse } from "next/server";

import { createAppRedirectPage } from "@/server/auth/appRedirectPage";
import { setAuthCookies } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";
import { clearOAuthCsrfCookie, getOAuthCsrfCookie } from "@/server/auth/oauthCookies";
import {
  getAppCallbackUrl,
  getLoginErrorUrl,
  getOAuthRedirectUri,
  toPublicUrl,
} from "@/server/auth/oauthUrls";

import type { LoginError } from "@/server/auth/oauthUrls";
import type { OAuthState } from "@makkigo/auth";
import type { NextRequest } from "next/server";

const CANCEL_ERRORS = new Set(["access_denied", "user_cancelled_authorize", "user_cancelled"]);

const readCallbackParams = async (request: NextRequest) => {
  const params =
    request.method === "POST"
      ? new URLSearchParams(
          [...(await request.formData()).entries()].filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : request.nextUrl.searchParams;

  return {
    code: params.get("code"),
    idToken: params.get("id_token"),
    state: params.get("state"),
    error: params.get("error"),
  };
};

const fail = (state: OAuthState | null, error: LoginError) => {
  const response =
    state?.client === "app"
      ? createAppRedirectPage(getAppCallbackUrl({ error }))
      : NextResponse.redirect(getLoginErrorUrl(error), 303);
  clearOAuthCsrfCookie(response);

  return response;
};

const handleCallback = async (
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) => {
  const provider = parseSocialProvider((await params).provider);
  const callback = await readCallbackParams(request);

  if (!provider) {
    return fail(null, "failed");
  }

  const state = await readUserOAuthState({
    provider,
    state: callback.state,
    csrf: getOAuthCsrfCookie(request),
  });

  if (!state || !callback.state) {
    return fail(null, "failed");
  }

  if (callback.error) {
    return fail(state, CANCEL_ERRORS.has(callback.error) ? "cancelled" : "failed");
  }

  try {
    const { userId } = await completeUserOAuth({
      provider,
      params: { code: callback.code, idToken: callback.idToken },
      state: callback.state,
      nonce: state.nonce,
      redirectUri: getOAuthRedirectUri(provider),
    });

    if (state.client === "app" && state.appChallenge) {
      const code = await createUserLoginCode(userId, state.appChallenge);
      const response = createAppRedirectPage(getAppCallbackUrl({ code }));
      clearOAuthCsrfCookie(response);

      return response;
    }

    const tokens = await issueUserTokens(userId, request.headers.get("user-agent"));
    const response = NextResponse.redirect(toPublicUrl(await getPathAfterLogin(userId)), 303);
    setAuthCookies(response, tokens);
    clearOAuthCsrfCookie(response);

    return response;
  } catch (error) {
    if (error instanceof SocialAuthError) {
      console.warn("Social login rejected", error.message);
    } else if (error instanceof AuthConfigError) {
      console.error("Auth configuration error", error.message);
    } else {
      console.error("Failed to complete social login", error);
    }

    return fail(state, "failed");
  }
};

export { handleCallback as GET, handleCallback as POST };
