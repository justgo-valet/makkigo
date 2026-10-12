import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const merchantService = vi.hoisted(() => ({ listBoothMerchants: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/booth/listBoothMerchants", () => ({
  listBoothMerchants: merchantService.listBoothMerchants,
}));

import { NextRequest } from "next/server";

import { GET } from "./route";

const URL_BASE = "http://localhost/api/v1/booths/3/merchants";
const context = (boothId = "3") => ({ params: Promise.resolve({ boothId }) });

const callGet = (query = "", boothId?: string) =>
  GET(new NextRequest(`${URL_BASE}${query}`), context(boothId));

const merchantPage = {
  items: [
    {
      id: 5,
      name: "샘플 식당",
      address: "서울특별시 중구 세종대로 110",
      addressDetail: "2층",
      status: "APPROVED",
      updatedAt: "2026-10-10T01:00:00.000Z",
    },
  ],
  page: 1,
  totalPages: 1,
};

describe("GET /api/v1/booths/:boothId/merchants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    merchantService.listBoothMerchants.mockResolvedValue({ ok: true, value: merchantPage });
  });

  it("returns the merchant page", async () => {
    const response = await callGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(merchantPage);
  });

  it("rejects an invalid page without calling the service", async () => {
    const response = await callGet("?page=0");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_PAGE" });
    expect(merchantService.listBoothMerchants).not.toHaveBeenCalled();
  });

  it("maps BOOTH_MANAGER_REQUIRED to 403", async () => {
    merchantService.listBoothMerchants.mockResolvedValue({ ok: false, reason: "BOOTH_MANAGER_REQUIRED" });

    const response = await callGet();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "BOOTH_MANAGER_REQUIRED" });
  });
});
