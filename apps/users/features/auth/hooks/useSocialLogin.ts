import { useState, useSyncExternalStore } from "react";

import { isInApp } from "@/features/auth/appBridge";
import { getDevicePlatform, PROVIDERS_BY_PLATFORM } from "@/features/auth/socialLoginProviders";
import { startSocialLogin } from "@/features/auth/startSocialLogin";

import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";

const subscribe = () => () => {};

const useSocialLogin = () => {
  // 서버에서는 기기를 모르므로 버튼은 브라우저에서만 그린다.
  const platform = useSyncExternalStore(
    subscribe,
    () => getDevicePlatform(navigator.userAgent),
    () => null,
  );
  const [isRedirecting, setIsRedirecting] = useState(false);

  const login = (provider: SocialLoginProvider) => {
    if (!isInApp()) setIsRedirecting(true);
    startSocialLogin(provider);
  };

  return {
    providers: platform ? PROVIDERS_BY_PLATFORM[platform] : [],
    isRedirecting,
    login,
  };
};

export { useSocialLogin };
