import { afterEach, describe, expect, it, vi } from "vitest";

import { createValetApiClient } from "./apiClient";

const BASE_URL = "https://makkigo.test";

const response = (status: number) => new Response(null, { status });

type Handler = (request: Request) => Response | Promise<Response>;

const mockFetch = (handler: Handler) => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const { pathname } = new URL(request.url);
      calls.push(`${request.method} ${pathname}`);
      return handler(request);
    }),
  );
  return calls;
};

const countCalls = (calls: string[], expected: string) =>
  calls.filter((call) => call === expected).length;

describe("valet apiClient retry policy", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not retry a failed PUT response", async () => {
    const calls = mockFetch(() => response(500));

    await expect(
      createValetApiClient({ baseUrl: BASE_URL, onAuthExpired: vi.fn() }).put("booths/1"),
    ).rejects.toThrow();

    expect(calls).toEqual(["PUT /api/v1/booths/1"]);
  });

  it("does not retry a PUT network error", async () => {
    const calls = mockFetch(() => Promise.reject(new TypeError("network unavailable")));

    await expect(
      createValetApiClient({ baseUrl: BASE_URL, onAuthExpired: vi.fn() }).put("booths/1"),
    ).rejects.toThrow("network unavailable");

    expect(calls).toEqual(["PUT /api/v1/booths/1"]);
  });

  it("does not retry a timed-out PUT", async () => {
    vi.useFakeTimers();
    const calls = mockFetch(
      (request) =>
        new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener("abort", () => reject(request.signal.reason));
        }),
    );
    const request = createValetApiClient({ baseUrl: BASE_URL, onAuthExpired: vi.fn() })
      .put("booths/1")
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(10_001);

    await expect(request).resolves.toBeInstanceOf(Error);
    expect(calls).toEqual(["PUT /api/v1/booths/1"]);
  });

  it("replays a PUT exactly once after a successful refresh", async () => {
    let refreshed = false;
    const calls = mockFetch((request) => {
      if (request.url.endsWith("/auth/refresh")) {
        refreshed = true;
        return response(204);
      }
      return refreshed ? response(204) : response(401);
    });

    await createValetApiClient({ baseUrl: BASE_URL, onAuthExpired: vi.fn() }).put("booths/1");

    expect(countCalls(calls, "PUT /api/v1/booths/1")).toBe(2);
    expect(countCalls(calls, "POST /api/v1/auth/refresh")).toBe(1);
  });

  it("expires the session after refresh failure without replaying the PUT", async () => {
    const onAuthExpired = vi.fn();
    const calls = mockFetch((request) =>
      request.url.endsWith("/auth/refresh") ? response(401) : response(401),
    );

    await expect(
      createValetApiClient({ baseUrl: BASE_URL, onAuthExpired }).put("booths/1"),
    ).rejects.toThrow();

    expect(countCalls(calls, "PUT /api/v1/booths/1")).toBe(1);
    expect(countCalls(calls, "POST /api/v1/auth/refresh")).toBe(1);
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });

  it("expires after a replayed 401 without a third PUT", async () => {
    const onAuthExpired = vi.fn();
    const calls = mockFetch((request) =>
      request.url.endsWith("/auth/refresh") ? response(204) : response(401),
    );

    await expect(
      createValetApiClient({ baseUrl: BASE_URL, onAuthExpired }).put("booths/1"),
    ).rejects.toThrow();

    expect(countCalls(calls, "PUT /api/v1/booths/1")).toBe(2);
    expect(countCalls(calls, "POST /api/v1/auth/refresh")).toBe(1);
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });
});
