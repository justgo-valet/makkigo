import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const onboarding = vi.hoisted(() => ({ getStaffOnboardingState: vi.fn() }));
const service = vi.hoisted(() => ({ listOwnMerchants: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getStaffOnboardingState", () => ({
  getStaffOnboardingState: onboarding.getStaffOnboardingState,
}));
vi.mock("@/server/merchant/listOwnMerchants", () => ({
  listOwnMerchants: service.listOwnMerchants,
}));

import { NextRequest } from "next/server";

import { GET } from "./route";

const callGet = () => GET(new NextRequest("http://localhost/api/v1/merchants/me"));
const merchantStatus = (state: string) => ({
  role: "MERCHANT_ADMIN",
  state,
  nextPath: state === "COMPLETE" ? "/" : "/onboarding",
  requests: [],
});

describe("GET /api/v1/merchants/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMAGE_BASE_URL = "https://images.example.com";
    auth.getCurrentStaffId.mockResolvedValue(7);
    onboarding.getStaffOnboardingState.mockResolvedValue(merchantStatus("COMPLETE"));
    service.listOwnMerchants.mockResolvedValue({ items: [] });
  });

  afterEach(() => delete process.env.IMAGE_BASE_URL);

  it("requires an active authenticated merchant", async () => {
    auth.getCurrentStaffId.mockResolvedValueOnce(null);
    expect((await callGet()).status).toBe(401);

    onboarding.getStaffOnboardingState.mockResolvedValueOnce(null);
    expect((await callGet()).status).toBe(401);

    onboarding.getStaffOnboardingState.mockResolvedValueOnce({
      role: "VALET_AGENT",
      state: "COMPLETE",
      nextPath: "/",
      requests: [],
    });
    const response = await callGet();
    expect(response.status).toBe(403);
    expect(service.listOwnMerchants).not.toHaveBeenCalled();
  });

  it.each([
    "MERCHANT_REGISTRATION_REQUIRED",
    "MERCHANT_APPROVAL_PENDING",
    "COMPLETE",
  ])("permits own read-only list in %s", async (state) => {
    onboarding.getStaffOnboardingState.mockResolvedValue(merchantStatus(state));
    const response = await callGet();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(service.listOwnMerchants).toHaveBeenCalledWith(7, "https://images.example.com");
  });
});
