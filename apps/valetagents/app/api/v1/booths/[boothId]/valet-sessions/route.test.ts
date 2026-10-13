import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const sessionService = vi.hoisted(() => ({ listBoothValetSessions: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/valet/listBoothValetSessions", () => ({
  listBoothValetSessions: sessionService.listBoothValetSessions,
}));

import { NextRequest } from "next/server";

import { GET } from "./route";

const IMAGE_BASE_URL = "https://images.example.com";

const callGet = (boothId = "3") =>
  GET(new NextRequest(`http://localhost/api/v1/booths/${boothId}/valet-sessions`), {
    params: Promise.resolve({ boothId }),
  });

describe("GET /api/v1/booths/:boothId/valet-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IMAGE_BASE_URL", IMAGE_BASE_URL);
    auth.getCurrentStaffId.mockResolvedValue(7);
    sessionService.listBoothValetSessions.mockResolvedValue({ ok: true, value: { items: [] } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires authentication and marks the response private", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callGet();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(sessionService.listBoothValetSessions).not.toHaveBeenCalled();
  });

  it("rejects a malformed booth id", async () => {
    const response = await callGet("abc");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(sessionService.listBoothValetSessions).not.toHaveBeenCalled();
  });

  it.each([
    ["BOOTH_NOT_FOUND", 404],
    ["BOOTH_AGENT_REQUIRED", 403],
  ] as const)("maps %s to %i", async (reason, status) => {
    sessionService.listBoothValetSessions.mockResolvedValue({ ok: false, reason });

    const response = await callGet();

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: reason });
  });

  it("returns the booth's sessions without caching", async () => {
    const response = await callGet();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ items: [] });
    expect(sessionService.listBoothValetSessions).toHaveBeenCalledWith(7, 3, IMAGE_BASE_URL);
  });
});
