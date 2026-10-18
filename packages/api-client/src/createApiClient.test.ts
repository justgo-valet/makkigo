import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./createApiClient";
import { getErrorMessage } from "./getErrorMessage";

const BASE_URL = "https://makkigo.test";

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
  });

type Handler = (request: Request) => Response | Promise<Response>;

const mockServer = (handler: Handler) => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const { pathname } = new URL(input.url);
      calls.push(`${input.method} ${pathname}`);
      return handler(input);
    }),
  );
  return calls;
};

const countCalls = (calls: string[], call: string) => calls.filter((c) => c === call).length;

describe("createApiClient", () => {
  let onAuthExpired: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onAuthExpired = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createClient = () => createApiClient({ onAuthExpired, baseUrl: BASE_URL });

  it("요청 경로 앞에 /api/v1 을 붙인다", async () => {
    const calls = mockServer(() => json(200, { ok: true }));

    await createClient().get("users/me").json();

    expect(calls).toEqual(["GET /api/v1/users/me"]);
  });

  it("401 이면 재발급 후 원래 요청을 한 번 다시 보낸다", async () => {
    let refreshed = false;
    const calls = mockServer((request) => {
      if (request.url.endsWith("/auth/refresh")) {
        refreshed = true;
        return json(204);
      }
      return refreshed ? json(200, { ok: true }) : json(401, { message: "만료" });
    });

    const result = await createClient()
      .post("onboarding", { json: { a: 1 } })
      .json();

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      "POST /api/v1/onboarding",
      "POST /api/v1/auth/refresh",
      "POST /api/v1/onboarding",
    ]);
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  it("동시에 여러 요청이 401 을 받아도 재발급은 한 번만 보낸다", async () => {
    let refreshed = false;
    let releaseRefresh: (() => void) | undefined;
    const refreshDone = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const calls = mockServer(async (request) => {
      if (request.url.endsWith("/auth/refresh")) {
        await refreshDone;
        refreshed = true;
        return json(204);
      }
      return refreshed ? json(200, { ok: true }) : json(401);
    });

    const client = createClient();
    const requests = Array.from({ length: 5 }, (_, i) => client.get(`items/${i}`).json());
    setTimeout(() => releaseRefresh?.(), 20);
    const results = await Promise.all(requests);

    expect(results).toHaveLength(5);
    expect(countCalls(calls, "POST /api/v1/auth/refresh")).toBe(1);
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  it("재발급이 실패하면 onAuthExpired 를 부르고 401 에러를 던진다", async () => {
    const calls = mockServer((request) =>
      request.url.endsWith("/auth/refresh") ? json(401) : json(401, { message: "만료" }),
    );

    await expect(createClient().get("users/me").json()).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
    expect(countCalls(calls, "GET /api/v1/users/me")).toBe(1);
  });

  it("재발급 후에도 401 이면 다시 재발급하지 않는다", async () => {
    const calls = mockServer((request) =>
      request.url.endsWith("/auth/refresh") ? json(204) : json(401),
    );

    await expect(createClient().get("users/me").json()).rejects.toThrow();
    expect(countCalls(calls, "POST /api/v1/auth/refresh")).toBe(1);
    expect(countCalls(calls, "GET /api/v1/users/me")).toBe(2);
  });

  it.each(["auth/social/kakao", "auth/oauth/kakao/native", "auth/refresh", "auth/logout"])(
    "%s 의 401 은 재발급하지 않는다",
    async (path) => {
      const calls = mockServer(() => json(401, { message: "소셜 토큰 오류" }));

      await expect(createClient().post(path).json()).rejects.toThrow();
      expect(calls).toEqual([`POST /api/v1/${path}`]);
      expect(onAuthExpired).not.toHaveBeenCalled();
    },
  );

  it("401 이 아닌 오류는 그대로 던진다", async () => {
    const calls = mockServer(() => json(409, { message: "이미 등록된 휴대폰 번호입니다." }));

    await expect(createClient().post("onboarding").json()).rejects.toMatchObject({
      response: { status: 409 },
    });
    expect(calls).toEqual(["POST /api/v1/onboarding"]);
  });
});

describe("getErrorMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("서버가 보낸 message 를 꺼낸다", async () => {
    mockServer(() => json(409, { message: "이미 등록된 휴대폰 번호입니다." }));

    const error = await createApiClient({ onAuthExpired: vi.fn(), baseUrl: BASE_URL })
      .post("onboarding")
      .json()
      .catch((e: unknown) => e);

    expect(getErrorMessage(error, "기본")).toBe("이미 등록된 휴대폰 번호입니다.");
  });

  it("message 가 없거나 HTTP 오류가 아니면 기본 문장을 쓴다", async () => {
    mockServer(() => new Response("Bad Gateway", { status: 502 }));

    const error = await createApiClient({ onAuthExpired: vi.fn(), baseUrl: BASE_URL })
      .post("onboarding")
      .json()
      .catch((e: unknown) => e);

    expect(getErrorMessage(error, "기본")).toBe("기본");
    expect(getErrorMessage(new Error("network"), "기본")).toBe("기본");
  });
});
