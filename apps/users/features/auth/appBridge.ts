import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";

interface MakkigoAppChannel {
  postMessage: (message: string) => void;
}

const getAppChannel = () =>
  (window as Window & { MakkigoApp?: MakkigoAppChannel }).MakkigoApp ?? null;

const isInApp = () => getAppChannel() !== null;

const requestAppSocialLogin = (provider: SocialLoginProvider) => {
  getAppChannel()?.postMessage(JSON.stringify({ type: "socialLogin", provider }));
};

export { isInApp, requestAppSocialLogin };
