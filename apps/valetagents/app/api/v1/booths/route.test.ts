import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn(), getActiveStaffRole: vi.fn() }));
const boothService = vi.hoisted(() => ({ createBooth: vi.fn(), searchBooths: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/auth/getActiveStaffRole", () => ({
  getActiveStaffRole: auth.getActiveStaffRole,
}));
vi.mock("@/server/booth/createBooth", () => ({
  createBooth: boothService.createBooth,
}));
vi.mock("@/server/booth/searchBooths", () => ({
  searchBooths: boothService.searchBooths,
}));

import { NextRequest } from "next/server";

import { POST } from "./route";

const callPostRaw = (body: string) =>
  POST(
    new NextRequest("http://localhost/api/v1/booths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );

const callPost = (body: unknown) => callPostRaw(JSON.stringify(body));

const createBody = { name: "시청 부스", address: "서울특별시 중구 세종대로 110" };

describe("POST /api/v1/booths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    boothService.createBooth.mockResolvedValue({ ok: true, value: { id: 3 } });
  });

  afterEach(() => vi.restoreAllMocks());

  it("requires authentication and marks the response private", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callPost(createBody);

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(boothService.createBooth).not.toHaveBeenCalled();
  });

  it.each([
    { address: createBody.address },
    { ...createBody, name: "" },
    { ...createBody, name: "   " },
    { name: createBody.name },
    { ...createBody, address: "" },
    { ...createBody, address: "   " },
    { ...createBody, addressDetail: null },
    { ...createBody, photos: ["booth.png"] },
    null,
  ])("rejects invalid payload %#", async (body) => {
    const response = await callPost(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(boothService.createBooth).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const response = await callPostRaw("{");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(boothService.createBooth).not.toHaveBeenCalled();
  });

  it("returns 201 with the new booth id and passes the trimmed body", async () => {
    const response = await callPost({ name: " 시청 부스 ", address: createBody.address, addressDetail: "" });

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ id: 3 });
    expect(boothService.createBooth).toHaveBeenCalledWith(7, { ...createBody, addressDetail: null });
  });

  it.each([
    ["AUTH_REQUIRED", 401],
    ["VALET_AGENT_REQUIRED", 403],
    ["ALREADY_ONBOARDED", 403],
    ["REQUEST_CONFLICT", 409],
  ] as const)("maps %s to %i", async (reason, status) => {
    boothService.createBooth.mockResolvedValue({ ok: false, reason });

    const response = await callPost(createBody);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: reason });
  });

  it("answers 500 when the booth could not be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    boothService.createBooth.mockRejectedValue(new Error("database down"));

    const response = await callPost(createBody);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});
