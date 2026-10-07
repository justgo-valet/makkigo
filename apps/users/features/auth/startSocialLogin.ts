import { isInApp, requestAppSocialLogin } from "@/features/auth/appBridge";

import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";

const startSocialLogin = (provider: SocialLoginProvider) => {
  if (isInApp()) {
    requestAppSocialLogin(provider);
    return;
  }

  window.location.assign(new URL(`/api/v1/auth/oauth/${provider}`, window.location.origin));
};

export { startSocialLogin };
