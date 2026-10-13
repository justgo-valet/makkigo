import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const access = vi.hoisted(() => ({ getMerchantRegistrationAccess: vi.fn() }));
const service = vi.hoisted(() => ({ revoke: vi.fn() }));
vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getMerchantRegistrationAccess", () => ({
  getMerchantRegistrationAccess: access.getMerchantRegistrationAccess,
}));
vi.mock("@/server/merchantUploads/merchantUploadSessions", () => ({
  prismaMerchantUploadSessionRepository: {},
  createMerchantUploadSessionService: () => service,
}));

import { NextRequest } from "next/server";

import { DELETE } from "./route";

const sessionId = "018f47a3-7b4c-7b1f-8db8-743c634d9651";
const uploadId = "018f47a3-7b4c-7b1f-8db8-743c634d9652";
const callDelete = () =>
  DELETE(
    new NextRequest(
      `http://localhost/api/v1/merchant-registration-sessions/${sessionId}/uploads/${uploadId}`,
      { method: "DELETE" },
    ),
    { params: Promise.resolve({ sessionId, uploadId }) },
  );

describe("DELETE registration upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    access.getMerchantRegistrationAccess.mockResolvedValue({ ok: true });
  });

  it("denies approval-pending before mutation", async () => {
    access.getMerchantRegistrationAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });
    const response = await callDelete();
    expect(response.status).toBe(403);
    expect(service.revoke).not.toHaveBeenCalled();
  });

  it("returns an idempotent revoke result", async () => {
    service.revoke.mockResolvedValue({ kind: "REVOKED", uploadId });
    const response = await callDelete();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ code: "UPLOAD_REVOKED", uploadId });
  });

  it.each([
    ["SESSION_FROZEN", 409],
    ["SESSION_EXPIRED", 410],
    ["SESSION_FORBIDDEN", 403],
    ["UPLOAD_FORBIDDEN", 403],
  ] as const)("maps %s without attempting a second mutation", async (kind, status) => {
    service.revoke.mockResolvedValue({ kind });
    const response = await callDelete();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: kind });
  });
});
