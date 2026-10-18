import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

import { completeNativeLogin } from "@/features/auth/apis/completeNativeLogin";
import { isInApp, requestAppNativeLogin } from "@/features/auth/appBridge";
import { getDevicePlatform, PROVIDERS_BY_PLATFORM } from "@/features/auth/socialLoginProviders";
import { startSocialLogin } from "@/features/auth/startSocialLogin";

import type { LoginError, SocialLoginProvider } from "@/features/auth/socialLoginProviders";

const subscribe = () => () => {};

type AppLoginOutcome = { redirectTo: string } | { error: LoginError };

/** 앱 안: 앱이 카카오 · 구글 · 애플 SDK 로 로그인하고, 받은 토큰을 서버가 확인해 쿠키를 심는다. */
const loginWithApp = async (provider: SocialLoginProvider): Promise<AppLoginOutcome> => {
  const result = await requestAppNativeLogin(provider);

  if (result.status !== "success") return { error: result.status };

  return completeNativeLogin(provider, result.credential);
};

const useSocialLogin = (error: LoginError | null) => {
  // 서버에서는 기기를 모르므로 버튼은 브라우저에서만 그린다.
  const platform = useSyncExternalStore(
    subscribe,
    () => getDevicePlatform(navigator.userAgent),
    () => null,
  );
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [appLoginError, setAppLoginError] = useState<LoginError | null>(null);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setIsRedirecting(false);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
  const { mutate: startAppLogin, isPending: isLoggingInWithApp } = useMutation({
    mutationFn: loginWithApp,
    onSuccess: (outcome) => {
      if ("error" in outcome) {
        setAppLoginError(outcome.error);
        return;
      }

      setIsRedirecting(true);
      window.location.assign(outcome.redirectTo);
    },
    onError: () => setAppLoginError("failed"),
  });

  const login = (provider: SocialLoginProvider) => {
    if (isInApp()) {
      setAppLoginError(null);
      startAppLogin(provider);
      return;
    }

    setIsRedirecting(true);
    startSocialLogin(provider);
  };

  return {
    providers: platform ? PROVIDERS_BY_PLATFORM[platform] : [],
    isRedirecting: isRedirecting || isLoggingInWithApp,
    error: appLoginError ?? error,
    login,
  };
};

export { useSocialLogin };
