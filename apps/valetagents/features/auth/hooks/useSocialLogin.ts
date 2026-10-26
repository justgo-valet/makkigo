import { useEffect, useState, useSyncExternalStore } from "react";

import { createAppLoginSession } from "@/features/auth/apis/createAppLoginSession";
import { isInApp, openAppAuthSession } from "@/features/auth/appBridge";
import { cleanupExpiredPushSession } from "@/features/push/cleanupExpiredPushSession";
import { getProviders } from "@/features/auth/socialLoginProviders";

import type { LoginError, SocialLoginProvider } from "@/features/auth/socialLoginProviders";

const subscribe = () => () => {};

const useSocialLogin = (error: LoginError | null) => {
  const userAgent = useSyncExternalStore(
    subscribe,
    () => navigator.userAgent,
    () => "",
  );
  const [pending, setPending] = useState(false);
  const [displayedError, setDisplayedError] = useState<LoginError | null>(error);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const login = async (provider: SocialLoginProvider) => {
    setPending(true);
    setDisplayedError(null);
    try {
      await cleanupExpiredPushSession();
    } catch {
      setDisplayedError("failed");
      setPending(false);
      return;
    }
    if (!isInApp()) {
      window.location.assign(new URL(`/api/v1/auth/oauth/${provider}`, window.location.origin));
      return;
    }
    try {
      const { authUrl, returnUrl } = await createAppLoginSession(provider);
      openAppAuthSession({ url: authUrl, returnUrl });
    } catch {
      setDisplayedError("failed");
    } finally {
      setPending(false);
    }
  };

  return {
    providers: userAgent ? getProviders(userAgent) : [],
    pending,
    error: displayedError,
    login,
  };
};

export { useSocialLogin };
