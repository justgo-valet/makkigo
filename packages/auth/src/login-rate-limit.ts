const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 20;
const MAX_TRACKED = 10_000;

const attempts = new Map<string, { count: number; resetAt: number }>();

export const takeLoginAttempt = (key: string, now = Date.now()) => {
  if (attempts.size > MAX_TRACKED) {
    for (const [tracked, entry] of attempts) if (entry.resetAt <= now) attempts.delete(tracked);
  }

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMIT;
};

export const getClientIp = (headers: Headers) =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
