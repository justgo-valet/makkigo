import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const access = vi.hoisted(() => ({ getMerchantRegistrationAccess: vi.fn() }));
const service = vi.hoisted(() => ({ createOrResume: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getMerchantRegistrationAccess", () => ({
  getMerchantRegistrationAccess: access.getMerchantRegistrationAccess,
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

import { POST } from "./route";

const request = () =>
  new NextRequest("http://localhost/api/v1/merchant-registration-sessions", { method: "POST" });
const session = {
  id: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
  state: "OPEN",
  expiresAt: new Date("2026-10-13T00:00:00.000Z"),
  merchantId: null,
  replayResponse: null,
};

describe("POST /api/v1/merchant-registration-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    access.getMerchantRegistrationAccess.mockResolvedValue({ ok: true });
  });

  it("denies approval-pending users before session creation", async () => {
    access.getMerchantRegistrationAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });
    const response = await POST(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "MERCHANT_APPROVAL_PENDING" });
    expect(service.createOrResume).not.toHaveBeenCalled();
  });

  it("creates a fixed-lifetime session and returns its status URL", async () => {
    service.createOrResume.mockResolvedValue({ kind: "OPEN", session, resumed: false });
    const response = await POST(request());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      code: "SESSION_CREATED",
      sessionId: session.id,
      state: "OPEN",
      statusUrl: `/api/v1/merchant-registration-sessions/${session.id}`,
    });
  });

  it("resumes one OPEN session but blocks PROCESSING/RETRYABLE", async () => {
    service.createOrResume.mockResolvedValueOnce({ kind: "OPEN", session, resumed: true });
    const resumed = await POST(request());
    expect(resumed.status).toBe(200);
    await expect(resumed.json()).resolves.toMatchObject({ code: "SESSION_RESUMED" });

    service.createOrResume.mockResolvedValueOnce({
      kind: "UNRESOLVED",
      session: { ...session, state: "PROCESSING" },
    });
    const unresolved = await POST(request());
    expect(unresolved.status).toBe(409);
    await expect(unresolved.json()).resolves.toMatchObject({
      code: "UNRESOLVED_SUBMISSION",
      statusUrl: `/api/v1/merchant-registration-sessions/${session.id}`,
    });
  });
});
