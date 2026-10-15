const KAKAO_MAP_SCRIPT_ID = "kakao-maps-sdk";
const KAKAO_MAP_LOAD_TIMEOUT_MS = 10_000;

interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

interface KakaoMap {
  setCenter(position: KakaoLatLng): void;
}

interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
  setPosition(position: KakaoLatLng): void;
}

interface KakaoGeocoderResult {
  x: string;
  y: string;
}

interface KakaoMapsApi {
  load(callback: () => void): void;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng }) => KakaoMarker;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  services: {
    Geocoder: new () => {
      addressSearch(
        address: string,
        callback: (results: KakaoGeocoderResult[], status: string) => void,
      ): void;
    };
    Status: {
      OK: string;
    };
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

let loadingPromise: Promise<KakaoMapsApi> | null = null;
let readyMaps: KakaoMapsApi | null = null;

const getLoadedMaps = () => window.kakao?.maps;

const waitForKakaoMaps = (
  script: HTMLScriptElement,
  removeOnFailure: boolean,
): Promise<KakaoMapsApi> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let initializationStarted = false;
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (removeOnFailure) script.remove();
      reject(new Error(message));
    };
    const finish = () => {
      if (settled || initializationStarted) return;

      const maps = getLoadedMaps();
      if (!maps) {
        fail("카카오 지도 SDK를 초기화하지 못했습니다.");
        return;
      }

      initializationStarted = true;
      try {
        maps.load(() => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(maps);
        });
      } catch {
        fail("카카오 지도 SDK를 초기화하지 못했습니다.");
      }
    };
    const handleLoad = () => finish();
    const handleError = () => fail("카카오 지도 SDK를 불러오지 못했습니다.");
    const timeout = window.setTimeout(
      () => fail("카카오 지도 SDK 응답 시간이 초과되었습니다."),
      KAKAO_MAP_LOAD_TIMEOUT_MS,
    );

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (getLoadedMaps()) finish();
  });

const loadKakaoMaps = (appKey: string): Promise<KakaoMapsApi> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("카카오 지도는 브라우저에서만 사용할 수 있습니다."));
  }
  if (!appKey.trim()) {
    return Promise.reject(new Error("카카오 지도 앱 키가 설정되지 않았습니다."));
  }
  if (readyMaps) return Promise.resolve(readyMaps);
  if (loadingPromise) return loadingPromise;

  const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID) as HTMLScriptElement | null;
  const script = existingScript ?? document.createElement("script");

  if (!existingScript) {
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false&libraries=services`;
    document.head.append(script);
  }

  loadingPromise = waitForKakaoMaps(script, !existingScript)
    .then((maps) => {
      readyMaps = maps;
      return maps;
    })
    .catch((error) => {
      loadingPromise = null;
      if (script.isConnected && !getLoadedMaps()) script.remove();
      throw error;
    });

  return loadingPromise;
};

const resetKakaoMapsLoaderForTests = () => {
  loadingPromise = null;
  readyMaps = null;
};

export {
  KAKAO_MAP_LOAD_TIMEOUT_MS,
  KAKAO_MAP_SCRIPT_ID,
  loadKakaoMaps,
  resetKakaoMapsLoaderForTests,
};
export type { KakaoGeocoderResult, KakaoMap, KakaoMapsApi, KakaoMarker };
