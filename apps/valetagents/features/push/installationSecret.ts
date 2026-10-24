const STORAGE_KEY = "makkigo:valetagents:push-installation-secret";
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const readPushInstallationSecret = () => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && SECRET_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
};

const createSecret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const requirePushInstallationSecret = () => {
  const existing = readPushInstallationSecret();
  if (existing) return existing;
  const created = createSecret();
  try {
    window.localStorage.setItem(STORAGE_KEY, created);
  } catch {
    throw new Error("알림 기기 식별자를 안전하게 저장하지 못했습니다.");
  }
  if (readPushInstallationSecret() !== created) {
    throw new Error("알림 기기 식별자를 확인하지 못했습니다.");
  }
  return created;
};

export { readPushInstallationSecret, requirePushInstallationSecret };
