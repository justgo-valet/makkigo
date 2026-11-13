import "server-only";

const WINDOW_MS = 60_000;
const LIMITS = { read: 120, pickup: 10 } as const;
const MAX_TRACKED = 10_000;

type GuestRequestKind = keyof typeof LIMITS;

const hits = new Map<string, { count: number; resetAt: number }>();

const takeGuestRequest = (kind: GuestRequestKind, client: string, now = Date.now()) => {
  if (hits.size > MAX_TRACKED) {
    for (const [tracked, entry] of hits) if (entry.resetAt <= now) hits.delete(tracked);
  }

  const key = `${kind}:${client}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMITS[kind];
};

export { takeGuestRequest };
export type { GuestRequestKind };
