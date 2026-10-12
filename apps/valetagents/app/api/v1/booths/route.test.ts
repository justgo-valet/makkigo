import { beforeEach, describe, expect, it, vi } from "vitest";

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

const callPost = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/v1/booths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const createBody = { name: "시청 부스", address: "서울특별시 중구 세종대로 110" };

describe("POST /api/v1/booths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    boothService.createBooth.mockResolvedValue({ ok: true, value: { id: 3 } });
  });

  it("rejects an invalid body without calling the service", async () => {
    const response = await callPost({ address: createBody.address });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(boothService.createBooth).not.toHaveBeenCalled();
  });

  it("returns 201 with the new booth id", async () => {
    const response = await callPost(createBody);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 3 });
  });

  it("maps ALREADY_ONBOARDED to 403", async () => {
    boothService.createBooth.mockResolvedValue({ ok: false, reason: "ALREADY_ONBOARDED" });

    const response = await callPost(createBody);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "ALREADY_ONBOARDED" });
  });
});
