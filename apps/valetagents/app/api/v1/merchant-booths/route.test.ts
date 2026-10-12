import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const access = vi.hoisted(() => ({ getMerchantRegistrationAccess: vi.fn() }));
const service = vi.hoisted(() => ({ searchMerchantBooths: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getMerchantRegistrationAccess", () => ({
  getMerchantRegistrationAccess: access.getMerchantRegistrationAccess,
}));
vi.mock("@/server/merchant/searchMerchantBooths", () => ({
  searchMerchantBooths: service.searchMerchantBooths,
}));

import { NextRequest } from "next/server";

import { GET } from "./route";

const callGet = (query = "강남") =>
  GET(new NextRequest(`http://localhost/api/v1/merchant-booths?query=${encodeURIComponent(query)}`));

describe("GET /api/v1/merchant-booths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    access.getMerchantRegistrationAccess.mockResolvedValue({ ok: true });
    service.searchMerchantBooths.mockResolvedValue({ items: [] });
  });

  it("requires authentication", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);
    const response = await callGet();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(access.getMerchantRegistrationAccess).not.toHaveBeenCalled();
  });

  it.each([
    ["MERCHANT_ADMIN_REQUIRED", 403],
    ["MERCHANT_APPROVAL_PENDING", 403],
    ["AUTH_REQUIRED", 401],
  ] as const)("denies %s before search", async (reason, status) => {
    access.getMerchantRegistrationAccess.mockResolvedValue({ ok: false, reason });
    const response = await callGet();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: reason });
    expect(service.searchMerchantBooths).not.toHaveBeenCalled();
  });

  it.each(["", "가".repeat(51)])("rejects invalid query length", async (query) => {
    const response = await callGet(query);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_QUERY" });
    expect(service.searchMerchantBooths).not.toHaveBeenCalled();
  });

  it("trims the query and returns a private response", async () => {
    const response = await callGet(" 강남 ");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(service.searchMerchantBooths).toHaveBeenCalledWith("강남");
  });
});
