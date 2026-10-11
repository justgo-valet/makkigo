import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const merchantService = vi.hoisted(() => ({
  listBoothMerchants: vi.fn(),
  reviewBoothMerchants: vi.fn(),
}));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/booth/listBoothMerchants", () => ({
  listBoothMerchants: merchantService.listBoothMerchants,
}));
vi.mock("@/server/booth/reviewBoothMerchants", () => ({
  reviewBoothMerchants: merchantService.reviewBoothMerchants,
}));

import { NextRequest } from "next/server";

import { GET, PATCH } from "./route";

const URL_BASE = "http://localhost/api/v1/booths/3/merchants";
const context = (boothId = "3") => ({ params: Promise.resolve({ boothId }) });

const callGet = (query = "", boothId?: string) =>
  GET(new NextRequest(`${URL_BASE}${query}`), context(boothId));

const callPatch = (body: unknown, boothId?: string) =>
  PATCH(
    new NextRequest(URL_BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    context(boothId),
  );

const reviewBody = {
  status: "APPROVED",
  merchants: [{ id: 5, updatedAt: "2026-10-10T01:00:00.000Z" }],
};

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

describe("PATCH /api/v1/booths/:boothId/merchants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    merchantService.reviewBoothMerchants.mockResolvedValue({ ok: true });
  });

  it("requires authentication", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callPatch(reviewBody);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(merchantService.reviewBoothMerchants).not.toHaveBeenCalled();
  });

  it("rejects a malformed booth id", async () => {
    const response = await callPatch(reviewBody, "abc");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(merchantService.reviewBoothMerchants).not.toHaveBeenCalled();
  });

  it.each([
    { status: "PENDING", merchants: reviewBody.merchants },
    { status: "APPROVED", merchants: [] },
    { status: "APPROVED" },
    { status: "APPROVED", merchants: [reviewBody.merchants[0], reviewBody.merchants[0]] },
    {
      status: "APPROVED",
      merchants: Array.from({ length: 6 }, (_, i) => ({ ...reviewBody.merchants[0], id: i + 1 })),
    },
    { ...reviewBody, staffId: 9 },
    "not json",
  ])("rejects invalid payload %#", async (body) => {
    const response = await callPatch(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(merchantService.reviewBoothMerchants).not.toHaveBeenCalled();
  });

  it("returns 204 without a body when every merchant was reviewed", async () => {
    const response = await callPatch(reviewBody);

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("");
    expect(merchantService.reviewBoothMerchants).toHaveBeenCalledWith(7, 3, reviewBody);
  });

  it.each([
    ["BOOTH_NOT_FOUND", 404],
    ["BOOTH_MANAGER_REQUIRED", 403],
    ["MERCHANT_NOT_FOUND", 404],
    ["MERCHANT_CHANGED", 409],
    ["MERCHANT_ALREADY_APPROVED", 409],
  ] as const)("maps %s to %i", async (reason, status) => {
    merchantService.reviewBoothMerchants.mockResolvedValue({ ok: false, reason });

    const response = await callPatch(reviewBody);

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: reason });
  });

  it("answers 500 without leaking the failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    merchantService.reviewBoothMerchants.mockRejectedValue(new Error("connection refused"));

    const response = await callPatch(reviewBody);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "INTERNAL_ERROR",
      message: "업체 계약 상태를 바꾸지 못했습니다.",
    });
    log.mockRestore();
  });
});
