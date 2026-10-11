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

interface AppPushState {
  pushToken: AppPushToken | null;
  isPermissionDenied: boolean;
}

type PushTokenEventDetail = {
  token: string | null;
  platform: AppPushToken["platform"];
  permission?: "granted" | "denied";
};

const toAppPushState = (event: Event): AppPushState => {
  const { token, platform, permission } = (event as CustomEvent<PushTokenEventDetail>).detail ?? {};

  return {
    pushToken: token && platform ? { token, platform } : null,
    isPermissionDenied: permission === "denied",
  };
};

const onAppPushToken = (listener: (state: AppPushState) => void) => {
  const handleEvent = (event: Event) => listener(toAppPushState(event));

  window.addEventListener(PUSH_TOKEN_EVENT, handleEvent);

  return () => window.removeEventListener(PUSH_TOKEN_EVENT, handleEvent);
};

const askAppForPushToken = () => {
  getAppChannel()?.postMessage(JSON.stringify({ type: "requestPushToken" }));
};

const openAppNotificationSettings = () => {
  getAppChannel()?.postMessage(JSON.stringify({ type: "openNotificationSettings" }));
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

export {
  askAppForPushToken,
  isInApp,
  onAppPushToken,
  openAppAuthSession,
  openAppNotificationSettings,
};
export type { AppPushState, AppPushToken };
