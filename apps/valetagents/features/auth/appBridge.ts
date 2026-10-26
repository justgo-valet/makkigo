interface MakkigoAppChannel { postMessage: (message: string) => void }

const PUSH_TOKEN_EVENT = "makkigo:push-token";
const channel = () => (window as Window & { MakkigoApp?: MakkigoAppChannel }).MakkigoApp ?? null;
export const isInApp = () => channel() !== null;

interface AppPushToken {
  token: string;
  platform: "IOS" | "ANDROID";
}

interface AppPushState {
  pushToken: AppPushToken | null;
  isPermissionDenied: boolean;
  isUnavailable: boolean;
}

type PushTokenEventDetail = {
  token?: unknown;
  platform?: unknown;
  permission?: unknown;
};

const toAppPushState = (event: Event): AppPushState => {
  const detail = (event as CustomEvent<PushTokenEventDetail>).detail ?? {};
  const platform = detail.platform === "IOS" || detail.platform === "ANDROID" ? detail.platform : null;
  const token = typeof detail.token === "string" && detail.token.length > 0 ? detail.token : null;

  return {
    pushToken: token && platform ? { token, platform } : null,
    isPermissionDenied: detail.permission === "denied",
    isUnavailable: detail.permission === "unavailable",
  };
};

export const onAppPushToken = (listener: (state: AppPushState) => void) => {
  const handleEvent = (event: Event) => listener(toAppPushState(event));
  window.addEventListener(PUSH_TOKEN_EVENT, handleEvent);
  return () => window.removeEventListener(PUSH_TOKEN_EVENT, handleEvent);
};

export const askAppForPushToken = () => {
  channel()?.postMessage(JSON.stringify({ type: "requestPushToken" }));
};

export const openAppNotificationSettings = () => {
  channel()?.postMessage(JSON.stringify({ type: "openNotificationSettings" }));
};

export const setAppAuthenticated = (authenticated: boolean) => {
  channel()?.postMessage(JSON.stringify({ type: "setAuthenticated", authenticated }));
};
export const openAppAuthSession = ({ url, returnUrl }: { url: string; returnUrl: string }) => {
  const absolute = (path: string) => new URL(path, window.location.origin).toString();
  channel()?.postMessage(JSON.stringify({
    type: "openAuthSession",
    url: absolute(url),
    returnUrl: absolute(returnUrl),
  }));
};

export type { AppPushState, AppPushToken };
