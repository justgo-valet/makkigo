import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  withdrawUser: vi.fn(),
}));

vi.mock("@/server/auth/getCurrentUserId", () => ({ getCurrentUserId: mocks.getCurrentUserId }));
vi.mock("@/server/user/withdrawUser", () => ({ withdrawUser: mocks.withdrawUser }));
vi.mock("@/server/user/getMe", () => ({ getMe: vi.fn() }));

import { NextRequest } from "next/server";

import { DELETE } from "./route";

const callDelete = () =>
  DELETE(new NextRequest("http://users:3001/api/v1/users/me", { method: "DELETE" }));

describe("DELETE /api/v1/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue(1);
  });

  it("returns 409 with a code while a valet session is in progress", async () => {
    mocks.withdrawUser.mockResolvedValue({ ok: false, reason: "ACTIVE_VALET_SESSION" });

    const response = await callDelete();

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "ACTIVE_VALET_SESSION" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("clears auth cookies after withdrawing", async () => {
    mocks.withdrawUser.mockResolvedValue({ ok: true });

    const response = await callDelete();

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).not.toBeNull();
  });
});
