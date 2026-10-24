const STORAGE_KEY = "makkigo:valetagents:registered-push-device";

interface RegisteredPushDevice {
  staffId: number;
}

const isRegisteredPushDevice = (value: unknown): value is RegisteredPushDevice => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RegisteredPushDevice>;
  return Number.isInteger(candidate.staffId) && (candidate.staffId ?? 0) > 0;
};

const readRegisteredPushDevice = (): RegisteredPushDevice | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isRegisteredPushDevice(parsed) ? parsed : null;
  } catch (error) {
    console.warn("Failed to read the non-authoritative push registration marker", error);
    return null;
  }
};

const saveRegisteredPushDevice = (device: RegisteredPushDevice | null) => {
  try {
    if (device) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(device));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // The signed HttpOnly capability remains authoritative when this UI marker fails.
    console.warn("Failed to save the non-authoritative push registration marker", error);
  }
};

export { readRegisteredPushDevice, saveRegisteredPushDevice };
export type { RegisteredPushDevice };
