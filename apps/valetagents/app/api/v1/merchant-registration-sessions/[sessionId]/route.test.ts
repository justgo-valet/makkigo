import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const onboarding = vi.hoisted(() => ({ getStaffOnboardingState: vi.fn() }));
const service = vi.hoisted(() => ({ getOwned: vi.fn() }));
vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getStaffOnboardingState", () => ({
  getStaffOnboardingState: onboarding.getStaffOnboardingState,
}));
vi.mock("@/server/merchantUploads/merchantUploadSessions", () => ({
  prismaMerchantUploadSessionRepository: {},
  createMerchantUploadSessionService: () => service,
  serializeSession: (session: { id: string; state: string; expiresAt: Date }) => ({
    sessionId: session.id,
    state: session.state,
    expiresAt: session.expiresAt.toISOString(),
    statusUrl: `/api/v1/merchant-registration-sessions/${session.id}`,
  }),
}));

import { NextRequest } from "next/server";

import { GET } from "./route";

const sessionId = "018f47a3-7b4c-7b1f-8db8-743c634d9651";
const callGet = () =>
  GET(new NextRequest(`http://localhost/api/v1/merchant-registration-sessions/${sessionId}`), {
    params: Promise.resolve({ sessionId }),
  });

describe("GET merchant registration session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    onboarding.getStaffOnboardingState.mockResolvedValue({
      role: "MERCHANT_ADMIN",
      state: "MERCHANT_APPROVAL_PENDING",
    });
  });

  it("allows a pending merchant admin to read only an owned status", async () => {
    service.getOwned.mockResolvedValue({
      kind: "FOUND",
      session: {
        id: sessionId,
        state: "COMMITTED",
        expiresAt: new Date("2026-10-12T00:00:00.000Z"),
        merchantId: 11,
        replayResponse: { merchantId: 11 },
      },
    });
    const response = await callGet();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ code: "COMMITTED", sessionId });
  });

  it.each([
    ["NOT_FOUND", 404, "SESSION_NOT_FOUND"],
    ["FORBIDDEN", 403, "SESSION_FORBIDDEN"],
  ] as const)("maps %s without disclosing a result", async (kind, status, code) => {
    service.getOwned.mockResolvedValue({ kind });
    const response = await callGet();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
  });

  it("returns an expired tombstone as 410", async () => {
    service.getOwned.mockResolvedValue({
      kind: "FOUND",
      session: {
        id: sessionId,
        state: "EXPIRED",
        expiresAt: new Date("2026-10-12T00:00:00.000Z"),
        merchantId: null,
        replayResponse: null,
      },
    });
    const response = await callGet();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});
