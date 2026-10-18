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

const LOCATION_EVENT = "makkigo:location";
const LOCATION_TIMEOUT_MS = 15 * 1000;

interface AppLocation {
  latitude: number;
  longitude: number;
}

type LocationEventDetail = {
  latitude: number | null;
  longitude: number | null;
};

const toAppLocation = (event: Event): AppLocation | null => {
  const { latitude, longitude } = (event as CustomEvent<LocationEventDetail>).detail ?? {};

  return typeof latitude === "number" && typeof longitude === "number"
    ? { latitude, longitude }
    : null;
};

const requestAppLocation = () =>
  new Promise<AppLocation | null>((resolve) => {
    if (!isInApp()) {
      resolve(null);
      return;
    }

    const finish = (location: AppLocation | null) => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(LOCATION_EVENT, handleEvent);
      resolve(location);
    };
    const handleEvent = (event: Event) => finish(toAppLocation(event));
    const timeoutId = window.setTimeout(() => finish(null), LOCATION_TIMEOUT_MS);

    window.addEventListener(LOCATION_EVENT, handleEvent);
    getAppChannel()?.postMessage(JSON.stringify({ type: "requestLocation" }));
  });

type AppStatusBarStyle = "light" | "dark";

/**
 * 상태바 글자색. `light` 는 흰 글자(어두운 배경), `dark` 는 검은 글자(밝은 배경).
 * 앱은 페이지를 새로 열 때마다 `dark` 로 되돌리므로, 어두운 화면이 켜질 때 `light` 를 보내고 벗어날 때 `dark` 로 돌려 둔다.
 */
const setAppStatusBarStyle = (style: AppStatusBarStyle) => {
  getAppChannel()?.postMessage(JSON.stringify({ type: "setStatusBarStyle", style }));
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
  requestAppLocation,
  setAppStatusBarStyle,
};
export type { AppLocation, AppPushState, AppPushToken, AppStatusBarStyle };
