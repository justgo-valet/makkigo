import { useMutation } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";

import { createAppLoginSession } from "@/features/auth/apis/createAppLoginSession";
import { isInApp, openAppAuthSession } from "@/features/auth/appBridge";
import { getDevicePlatform, PROVIDERS_BY_PLATFORM } from "@/features/auth/socialLoginProviders";
import { startSocialLogin } from "@/features/auth/startSocialLogin";

import type { LoginError, SocialLoginProvider } from "@/features/auth/socialLoginProviders";

const subscribe = () => () => {};

const useSocialLogin = (error: LoginError | null) => {
  // 서버에서는 기기를 모르므로 버튼은 브라우저에서만 그린다.
  const platform = useSyncExternalStore(
    subscribe,
    () => getDevicePlatform(navigator.userAgent),
    () => null,
  );
  const [isRedirecting, setIsRedirecting] = useState(false);
  const {
    mutate: startAppLogin,
    isPending: isStartingAppLogin,
    isError: hasAppLoginError,
  } = useMutation({
    mutationFn: createAppLoginSession,
    onSuccess: ({ authUrl, returnUrl }) => openAppAuthSession({ url: authUrl, returnUrl }),
  });

  const login = (provider: SocialLoginProvider) => {
    if (isInApp()) {
      startAppLogin(provider);
      return;
    }

    setIsRedirecting(true);
    startSocialLogin(provider);
  };

  return {
    providers: platform ? PROVIDERS_BY_PLATFORM[platform] : [],
    isRedirecting: isRedirecting || isStartingAppLogin,
    error: hasAppLoginError ? "failed" : error,
    login,
  };
};

export { useSocialLogin };
