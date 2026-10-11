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

  it("requires authentication and marks the response private", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callGet();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(merchantService.listBoothMerchants).not.toHaveBeenCalled();
  });

  it("returns the merchant page without caching it", async () => {
    const response = await callGet();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(merchantPage);
  });

  it("defaults to the first page and passes the requested page", async () => {
    await callGet();
    await callGet("?page=2");

    expect(merchantService.listBoothMerchants).toHaveBeenNthCalledWith(1, 7, 3, 1);
    expect(merchantService.listBoothMerchants).toHaveBeenNthCalledWith(2, 7, 3, 2);
  });

  it.each(["?page=0", "?page=-1", "?page=abc", "?page=1.5"])("rejects page query %s", async (query) => {
    const response = await callGet(query);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_PAGE" });
    expect(merchantService.listBoothMerchants).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-3", "1.5"])("rejects malformed booth id %s", async (boothId) => {
    const response = await callGet("", boothId);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(merchantService.listBoothMerchants).not.toHaveBeenCalled();
  });

  it.each([
    ["BOOTH_NOT_FOUND", 404],
    ["BOOTH_MANAGER_REQUIRED", 403],
  ] as const)("maps %s to %i", async (reason, status) => {
    merchantService.listBoothMerchants.mockResolvedValue({ ok: false, reason });

    const response = await callGet();

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: reason });
  });

  it("answers 500 without leaking the failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    merchantService.listBoothMerchants.mockRejectedValue(new Error("connection refused"));

    const response = await callGet();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "INTERNAL_ERROR",
      message: "업체 목록을 불러오지 못했습니다.",
    });
    log.mockRestore();
  });
});
