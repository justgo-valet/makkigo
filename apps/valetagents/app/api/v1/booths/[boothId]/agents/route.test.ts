import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const protectedAccess = vi.hoisted(() => ({ getProtectedStaffAccess: vi.fn() }));
const agentService = vi.hoisted(() => ({ listBoothAgents: vi.fn(), reviewBoothAgents: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/onboarding/getProtectedStaffAccess", () => ({
  getProtectedStaffAccess: protectedAccess.getProtectedStaffAccess,
}));
vi.mock("@/server/booth/listBoothAgents", () => ({
  listBoothAgents: agentService.listBoothAgents,
}));
vi.mock("@/server/booth/reviewBoothAgents", () => ({
  reviewBoothAgents: agentService.reviewBoothAgents,
}));

import { NextRequest } from "next/server";

import { GET, PATCH } from "./route";

const URL_BASE = "http://localhost/api/v1/booths/3/agents";
const context = (boothId = "3") => ({ params: Promise.resolve({ boothId }) });

const callGet = (query = "", boothId?: string) =>
  GET(new NextRequest(`${URL_BASE}${query}`), context(boothId));

const callPatch = (body: unknown) =>
  PATCH(
    new NextRequest(URL_BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    context(),
  );

const reviewBody = {
  status: "APPROVED",
  agents: [{ id: 5, updatedAt: "2026-10-10T01:00:00.000Z" }],
};

describe("GET /api/v1/booths/:boothId/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    protectedAccess.getProtectedStaffAccess.mockResolvedValue({ ok: true });
    agentService.listBoothAgents.mockResolvedValue({
      ok: true,
      value: { items: [], page: 1, totalPages: 1 },
    });
  });

  it("requires authentication and marks the response private", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callGet();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("rejects incomplete merchants before ownership lookup", async () => {
    protectedAccess.getProtectedStaffAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_ONBOARDING_REQUIRED",
    });
    const response = await callGet();
    expect(response.status).toBe(403);
    expect(agentService.listBoothAgents).not.toHaveBeenCalled();
  });

  it("defaults to the first page and passes the requested page", async () => {
    await callGet();
    await callGet("?page=2");

    expect(agentService.listBoothAgents).toHaveBeenNthCalledWith(1, 7, 3, 1);
    expect(agentService.listBoothAgents).toHaveBeenNthCalledWith(2, 7, 3, 2);
  });

  it.each(["?page=0", "?page=-1", "?page=abc", "?page=1.5"])("rejects page query %s", async (query) => {
    const response = await callGet(query);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_PAGE" });
    expect(agentService.listBoothAgents).not.toHaveBeenCalled();
  });

  it("rejects a malformed booth id", async () => {
    const response = await callGet("", "abc");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it.each([
    ["BOOTH_NOT_FOUND", 404],
    ["BOOTH_MANAGER_REQUIRED", 403],
  ] as const)("maps %s to %i", async (reason, status) => {
    agentService.listBoothAgents.mockResolvedValue({ ok: false, reason });

    const response = await callGet();

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: reason });
  });
});

describe("PATCH /api/v1/booths/:boothId/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    protectedAccess.getProtectedStaffAccess.mockResolvedValue({ ok: true });
    agentService.reviewBoothAgents.mockResolvedValue({ ok: true });
  });

  it("requires authentication", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callPatch(reviewBody);

    expect(response.status).toBe(401);
    expect(agentService.reviewBoothAgents).not.toHaveBeenCalled();
  });

  it("rejects incomplete merchants before mutation", async () => {
    protectedAccess.getProtectedStaffAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_ONBOARDING_REQUIRED",
    });
    const response = await callPatch(reviewBody);
    expect(response.status).toBe(403);
    expect(agentService.reviewBoothAgents).not.toHaveBeenCalled();
  });

  it.each([
    { status: "REQUESTED", agents: reviewBody.agents },
    { status: "APPROVED", agents: [] },
    { status: "APPROVED" },
    { ...reviewBody, staffId: 9 },
  ])("rejects invalid payload %#", async (body) => {
    const response = await callPatch(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(agentService.reviewBoothAgents).not.toHaveBeenCalled();
  });

  it("returns 204 without a body when every agent was reviewed", async () => {
    const response = await callPatch(reviewBody);

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(agentService.reviewBoothAgents).toHaveBeenCalledWith(7, 3, reviewBody);
  });

  it.each([
    ["BOOTH_NOT_FOUND", 404],
    ["BOOTH_MANAGER_REQUIRED", 403],
    ["AGENT_NOT_FOUND", 404],
    ["AGENT_CHANGED", 409],
    ["AGENT_ALREADY_APPROVED", 409],
  ] as const)("maps %s to %i", async (reason, status) => {
    agentService.reviewBoothAgents.mockResolvedValue({ ok: false, reason });

    const response = await callPatch(reviewBody);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: reason });
  });
});
