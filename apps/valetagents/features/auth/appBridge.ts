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

/**
 * 상태바 글자색. `light` 는 흰 글자(어두운 배경), `dark` 는 검은 글자(밝은 배경).
 * 앱은 페이지를 새로 열 때마다 `dark` 로 되돌리므로, 어두운 화면이 켜질 때 `light` 를 보내고 벗어날 때 `dark` 로 돌려 둔다.
 */
export const setAppStatusBarStyle = (style: "light" | "dark") => {
  channel()?.postMessage(JSON.stringify({ type: "setStatusBarStyle", style }));
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
