const KAKAO_POSTCODE_SCRIPT_ID = "kakao-postcode-sdk";
const KAKAO_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const KAKAO_POSTCODE_LOAD_TIMEOUT_MS = 10_000;

interface KakaoPostcodeAddress {
  zonecode: string;
  roadAddress: string;
  autoRoadAddress: string;
}

type KakaoPostcode = new (options: {
  oncomplete: (address: KakaoPostcodeAddress) => void;
  width: string;
  height: string;
}) => { embed(container: HTMLElement): void };

declare global {
  interface Window {
    daum?: { Postcode: KakaoPostcode };
  }
}

let loadingPromise: Promise<KakaoPostcode> | null = null;

const loadKakaoPostcode = (): Promise<KakaoPostcode> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("주소 검색은 브라우저에서만 사용할 수 있습니다."));
  }
  if (window.daum?.Postcode) return Promise.resolve(window.daum.Postcode);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<KakaoPostcode>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = (message: string) => {
      window.clearTimeout(timeout);
      script.remove();
      loadingPromise = null;
      reject(new Error(message));
    };
    const timeout = window.setTimeout(
      () => fail("주소 검색 응답 시간이 초과되었습니다."),
      KAKAO_POSTCODE_LOAD_TIMEOUT_MS,
    );

    script.id = KAKAO_POSTCODE_SCRIPT_ID;
    script.async = true;
    script.src = KAKAO_POSTCODE_SCRIPT_URL;
    script.addEventListener("error", () => fail("주소 검색을 불러오지 못했습니다."), { once: true });
    script.addEventListener(
      "load",
      () => {
        const Postcode = window.daum?.Postcode;
        if (!Postcode) {
          fail("주소 검색을 초기화하지 못했습니다.");
          return;
        }
        window.clearTimeout(timeout);
        resolve(Postcode);
      },
      { once: true },
    );
    document.head.append(script);
  });

  return loadingPromise;
};

export { loadKakaoPostcode };
