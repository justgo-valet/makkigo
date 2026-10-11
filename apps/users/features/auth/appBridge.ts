interface MakkigoAppChannel {
  postMessage: (message: string) => void;
}

const getAppChannel = () =>
  (window as Window & { MakkigoApp?: MakkigoAppChannel }).MakkigoApp ?? null;

const isInApp = () => getAppChannel() !== null;

const PUSH_TOKEN_EVENT = "makkigo:push-token";

interface AppPushToken {
  token: string;
  platform: "IOS" | "ANDROID";
}

type PushTokenEventDetail = { token: string | null; platform: AppPushToken["platform"] };

const toAppPushToken = (event: Event): AppPushToken | null => {
  const { token, platform } = (event as CustomEvent<PushTokenEventDetail>).detail ?? {};

  return token && platform ? { token, platform } : null;
};

const onAppPushToken = (listener: (pushToken: AppPushToken) => void) => {
  const handleEvent = (event: Event) => {
    const pushToken = toAppPushToken(event);
    if (pushToken) listener(pushToken);
  };

  window.addEventListener(PUSH_TOKEN_EVENT, handleEvent);

  return () => window.removeEventListener(PUSH_TOKEN_EVENT, handleEvent);
};

const askAppForPushToken = () => {
  getAppChannel()?.postMessage(JSON.stringify({ type: "requestPushToken" }));
};

const toAbsoluteUrl = (path: string) => new URL(path, window.location.origin).toString();

const openAppAuthSession = ({ url, returnUrl }: { url: string; returnUrl: string }) => {
  getAppChannel()?.postMessage(
    JSON.stringify({
      type: "openAuthSession",
      url: toAbsoluteUrl(url),
      returnUrl: toAbsoluteUrl(returnUrl),
    }),
  );
};

export { askAppForPushToken, isInApp, onAppPushToken, openAppAuthSession };
export type { AppPushToken };
