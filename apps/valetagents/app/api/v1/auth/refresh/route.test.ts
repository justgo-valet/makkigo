import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@makkigo/auth", () => {
  class InvalidRefreshTokenError extends Error {}

  return { InvalidRefreshTokenError, refreshStaffTokens: mocks.refresh };
});

import { InvalidRefreshTokenError } from "@makkigo/auth";
import { NextRequest } from "next/server";

import { GET } from "./route";

const expiresAt = new Date(Date.now() + 60_000);
const tokens = {
  accessToken: { token: "new-access", expiresAt },
  refreshToken: { token: "new-refresh", expiresAt },
};

const callGet = (next: string | null, refreshToken: string | null = "old-refresh") =>
  GET(
    new NextRequest(
      `http://internal:3000/api/v1/auth/refresh${next === null ? "" : `?next=${encodeURIComponent(next)}`}`,
      { headers: refreshToken ? { cookie: `makkigo_staff_refresh_token=${refreshToken}` } : {} },
    ),
  );

const cookieNames = (response: Response) =>
  response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);

describe("GET /api/v1/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PUBLIC_URL", "https://valet.makkigo.com");
    mocks.refresh.mockResolvedValue(tokens);
  });

  it("재발급하고 원래 화면으로 돌려보낸다", async () => {
    const response = await callGet("/tickets/3?tab=today");

    expect(mocks.refresh).toHaveBeenCalledWith({ refreshToken: "old-refresh", userAgent: null });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://valet.makkigo.com/tickets/3?tab=today");
    expect(cookieNames(response)).toEqual([
      "makkigo_staff_access_token=new-access",
      "makkigo_staff_refresh_token=new-refresh",
      "makkigo_staff_session=1",
    ]);
  });

  it("재발급에 실패하면 로그인 표시 쿠키만 지우고 원래 화면으로 보낸다", async () => {
    mocks.refresh.mockRejectedValue(new InvalidRefreshTokenError());

    const response = await callGet("/");

    expect(response.headers.get("location")).toBe("https://valet.makkigo.com/");
    expect(cookieNames(response)).toEqual(["makkigo_staff_session="]);
  });

  it("리프레시 쿠키가 없으면 재발급하지 않는다", async () => {
    const response = await callGet("/", null);

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(cookieNames(response)).toEqual(["makkigo_staff_session="]);
  });

  it.each([null, "https://evil.example/", "//evil.example/", "/\\evil.example/", "/api/v1/auth/logout"])(
    "다른 주소나 API 로는 보내지 않는다: %s",
    async (next) => {
      const response = await callGet(next);

      expect(response.headers.get("location")).toBe("https://valet.makkigo.com/");
    },
  );
});
