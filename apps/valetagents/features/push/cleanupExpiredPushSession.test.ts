import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupExpiredPushSession } from "./cleanupExpiredPushSession";

const MARKER_KEY = "makkigo:valetagents:registered-push-device";
const SECRET_KEY = "makkigo:valetagents:push-installation-secret";
const secret = "a".repeat(43);

const stubApp = (inApp: boolean) => {
  const storage = new Map<string, string>([
    [MARKER_KEY, JSON.stringify({ staffId: 7 })],
    [SECRET_KEY, secret],
  ]);
  const postMessage = vi.fn();
  vi.stubGlobal("window", {
    ...(inApp ? { MakkigoApp: { postMessage } } : {}),
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  return { storage, postMessage };
};

describe("cleanupExpiredPushSession", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing in a plain browser", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { storage } = stubApp(false);

    await cleanupExpiredPushSession();

    expect(fetch).not.toHaveBeenCalled();
    expect(storage.has(MARKER_KEY)).toBe(true);
  });

  it("marks the app logged out and removes this installation through logout", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const { storage, postMessage } = stubApp(true);

    await cleanupExpiredPushSession();

    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({
      type: "setAuthenticated",
      authenticated: false,
    });
    expect(fetch).toHaveBeenCalledWith("/api/v1/auth/logout", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ hasPushDevice: true, installationSecret: secret }),
    }));
    expect(storage.has(MARKER_KEY)).toBe(false);
    expect(storage.get(SECRET_KEY)).toBe(secret);
  });

  it("keeps the registration marker for a retry when cleanup fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    const { storage } = stubApp(true);

    await expect(cleanupExpiredPushSession()).rejects.toThrow();

    expect(storage.has(MARKER_KEY)).toBe(true);
  });
});
