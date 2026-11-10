import "server-only";

const WINDOW_MS = 60_000;
const LIMIT = 30;
const MAX_TRACKED = 10_000;

const hits = new Map<string, { count: number; resetAt: number }>();

const takeGuestRequest = (key: string, now = Date.now()) => {
  if (hits.size > MAX_TRACKED) {
    for (const [tracked, entry] of hits) if (entry.resetAt <= now) hits.delete(tracked);
  }

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMIT;
};

export { takeGuestRequest };
