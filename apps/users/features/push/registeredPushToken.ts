const STORAGE_KEY = "makkigo:registered-push-token";

const readRegisteredPushToken = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveRegisteredPushToken = (token: string | null) => {
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소를 못 쓰는 환경이면 로그아웃 때 기기 삭제만 건너뛴다.
  }
};

export { readRegisteredPushToken, saveRegisteredPushToken };
