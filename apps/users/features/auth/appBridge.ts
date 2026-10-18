import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";

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

const INSTALLED_APPS_EVENT = "makkigo:installed-apps";
const INSTALLED_APPS_TIMEOUT_MS = 5 * 1000;

type InstalledAppsEventDetail = {
  schemes?: unknown;
};

const toInstalledSchemes = (event: Event): string[] => {
  const { schemes } = (event as CustomEvent<InstalledAppsEventDetail>).detail ?? {};

  return Array.isArray(schemes)
    ? schemes.filter((scheme): scheme is string => typeof scheme === "string")
    : [];
};

/** 앱이 열 수 있는 스킴만 돌려준다. 앱 밖이거나 제때 응답이 없으면 빈 목록. */
const queryAppInstalledSchemes = (schemes: string[]) =>
  new Promise<string[]>((resolve) => {
    if (!isInApp()) {
      resolve([]);
      return;
    }

    const finish = (installed: string[]) => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(INSTALLED_APPS_EVENT, handleEvent);
      resolve(installed);
    };
    const handleEvent = (event: Event) => finish(toInstalledSchemes(event));
    const timeoutId = window.setTimeout(() => finish([]), INSTALLED_APPS_TIMEOUT_MS);

    window.addEventListener(INSTALLED_APPS_EVENT, handleEvent);
    getAppChannel()?.postMessage(JSON.stringify({ type: "queryInstalledApps", schemes }));
  });

const NATIVE_LOGIN_EVENT = "makkigo:native-login";

/** 앱이 제공자 SDK 로 받은 값. 카카오는 `accessToken`, 구글은 `idToken`, 애플은 `idToken` + `authorizationCode`. */
interface AppNativeLoginCredential {
  accessToken?: string;
  idToken?: string;
  authorizationCode?: string;
}

type AppNativeLoginResult =
  | { status: "success"; credential: AppNativeLoginCredential }
  | { status: "cancelled" | "failed" };

type NativeLoginEventDetail = AppNativeLoginCredential & {
  provider?: unknown;
  status?: unknown;
};

const pickString = (value: unknown) => (typeof value === "string" && value ? value : undefined);

const toNativeLoginResult = (detail: NativeLoginEventDetail): AppNativeLoginResult => {
  if (detail.status === "cancelled") return { status: "cancelled" };
  if (detail.status !== "success") return { status: "failed" };

  return {
    status: "success",
    credential: {
      accessToken: pickString(detail.accessToken),
      idToken: pickString(detail.idToken),
      authorizationCode: pickString(detail.authorizationCode),
    },
  };
};

/**
 * 앱이 카카오 · 구글 · 애플 SDK 로 로그인하게 하고 결과를 기다린다.
 * 사용자가 카카오톡 등 다른 앱에 다녀오는 동안 기다려야 하므로 시간 제한을 두지 않는다. 같은 제공자의 응답만 받는다.
 */
const requestAppNativeLogin = (provider: SocialLoginProvider) =>
  new Promise<AppNativeLoginResult>((resolve) => {
    if (!isInApp()) {
      resolve({ status: "failed" });
      return;
    }

    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<NativeLoginEventDetail>).detail ?? {};

      if (detail.provider !== provider) return;

      window.removeEventListener(NATIVE_LOGIN_EVENT, handleEvent);
      resolve(toNativeLoginResult(detail));
    };

    window.addEventListener(NATIVE_LOGIN_EVENT, handleEvent);
    getAppChannel()?.postMessage(JSON.stringify({ type: "nativeLogin", provider }));
  });

export {
  askAppForPushToken,
  isInApp,
  onAppPushToken,
  openAppNotificationSettings,
  queryAppInstalledSchemes,
  requestAppLocation,
  requestAppNativeLogin,
  setAppStatusBarStyle,
};
export type {
  AppLocation,
  AppNativeLoginCredential,
  AppNativeLoginResult,
  AppPushState,
  AppPushToken,
  AppStatusBarStyle,
};
