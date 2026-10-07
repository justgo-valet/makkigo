import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";

const startSocialLogin = (provider: SocialLoginProvider) => {
  window.location.assign(new URL(`/api/v1/auth/oauth/${provider}`, window.location.origin));
};

export { startSocialLogin };
