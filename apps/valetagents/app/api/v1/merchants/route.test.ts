import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const access = vi.hoisted(() => ({ getMerchantRegistrationAccess: vi.fn() }));
const registration = vi.hoisted(() => ({
  getActorRole: vi.fn(),
  findExisting: vi.fn(),
  register: vi.fn(),
  createService: vi.fn(),
}));
const storage = vi.hoisted(() => ({ create: vi.fn(() => ({})) }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getMerchantRegistrationAccess", () => ({
  getMerchantRegistrationAccess: access.getMerchantRegistrationAccess,
}));
vi.mock("@/server/merchantUploads/s3MerchantUploadStorage", () => ({
  createS3MerchantUploadStorage: storage.create,
}));
vi.mock("@/server/merchant/registerMerchant", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/merchant/registerMerchant")>();
  return {
    ...original,
    getMerchantRegistrationActorRole: registration.getActorRole,
    prismaMerchantRegistrationRepository: { findExisting: registration.findExisting },
    createMerchantRegistrationService: registration.createService,
  };
});

import { NextRequest } from "next/server";

import { POST } from "./route";

const sessionId = "018f47a3-7b4c-7b1f-8db8-743c634d9650";
const body = {
  sessionId,
  name: "테스트 업체",
  roadAddress: "서울특별시 중구 세종대로 110",
  addressDetail: "2층",
  postalCode: "04524",
  latitude: 37.5666805,
  longitude: 126.9784147,
  boothId: 1,
  uploadIds: ["018f47a3-7b4c-7b1f-8db8-743c634d9651"],
};

const callPost = (overrides?: {
  body?: unknown;
  origin?: string | null;
  key?: string | null;
  forwardedHost?: string;
}) => {
  const headers = new Headers({ "Content-Type": "application/json", Host: "localhost" });
  if (overrides?.forwardedHost) headers.set("X-Forwarded-Host", overrides.forwardedHost);
  if (overrides?.origin !== null) headers.set("Origin", overrides?.origin ?? "http://localhost");
  if (overrides?.key !== null) headers.set("Idempotency-Key", overrides?.key ?? "register-key-1");
  return POST(
    new NextRequest("http://localhost/api/v1/merchants", {
      method: "POST",
      headers,
      body: JSON.stringify(overrides?.body ?? body),
    }),
  );
};

describe("POST /api/v1/merchants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    registration.getActorRole.mockResolvedValue("MERCHANT_ADMIN");
    access.getMerchantRegistrationAccess.mockResolvedValue({ ok: true });
    registration.findExisting.mockResolvedValue({ kind: "NONE" });
    registration.createService.mockReturnValue({ register: registration.register });
    registration.register.mockResolvedValue({
      kind: "CREATED",
      result: {
        sessionId,
        merchantId: 11,
        statusUrl: `/api/v1/merchant-registration-sessions/${sessionId}`,
      },
    });
  });

  it("rejects unauthenticated and wrong-role callers before idempotency disclosure", async () => {
    auth.getCurrentStaffId.mockResolvedValueOnce(null);
    expect((await callPost()).status).toBe(401);

    registration.getActorRole.mockResolvedValueOnce("VALET_AGENT");
    expect((await callPost()).status).toBe(403);
    expect(registration.findExisting).not.toHaveBeenCalled();
  });

  it("rejects missing/cross-origin, missing key and invalid payload before storage", async () => {
    expect((await callPost({ origin: null })).status).toBe(403);
    expect((await callPost({ origin: "https://evil.example" })).status).toBe(403);
    expect((await callPost({ key: null })).status).toBe(400);
    expect((await callPost({ body: { ...body, uploadIds: [] } })).status).toBe(400);
    expect(storage.create).not.toHaveBeenCalled();
    expect(registration.register).not.toHaveBeenCalled();
  });

  it("compares the origin with the public host behind the proxy", async () => {
    const origin = "https://valet.example";
    expect((await callPost({ origin, forwardedHost: "valet.example" })).status).toBe(201);
    expect((await callPost({ origin, forwardedHost: "other.example" })).status).toBe(403);
  });

  it("returns the committed result when the first commit lands before the pending guard", async () => {
    const result = {
      sessionId,
      merchantId: 11,
      statusUrl: `/api/v1/merchant-registration-sessions/${sessionId}`,
    };
    registration.findExisting
      .mockResolvedValueOnce({ kind: "NONE" })
      .mockResolvedValueOnce({ kind: "REPLAY", result });
    access.getMerchantRegistrationAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });

    const response = await callPost();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ code: "COMMITTED", merchantId: 11 });
    expect(registration.register).not.toHaveBeenCalled();
  });

  it("returns an exact committed replay before the pending mutation guard", async () => {
    registration.findExisting.mockResolvedValue({
      kind: "REPLAY",
      result: {
        sessionId,
        merchantId: 11,
        statusUrl: `/api/v1/merchant-registration-sessions/${sessionId}`,
      },
    });
    access.getMerchantRegistrationAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });

    const response = await callPost();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ code: "COMMITTED", merchantId: 11 });
    expect(access.getMerchantRegistrationAccess).not.toHaveBeenCalled();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("returns conflict before pending mutation eligibility without exposing another owner", async () => {
    registration.findExisting.mockResolvedValue({ kind: "CONFLICT", sessionId });
    const response = await callPost({ body: { ...body, name: "변경 이름" } });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("denies a pending non-replay before constructing S3 or mutating", async () => {
    access.getMerchantRegistrationAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });
    const response = await callPost();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "MERCHANT_APPROVAL_PENDING" });
    expect(storage.create).not.toHaveBeenCalled();
    expect(registration.register).not.toHaveBeenCalled();
  });

  it("creates once with normalized payload and stable hash", async () => {
    const response = await callPost({ body: { ...body, name: "  테스트 업체  " } });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      code: "CREATED",
      sessionId,
      merchantId: 11,
      statusUrl: `/api/v1/merchant-registration-sessions/${sessionId}`,
    });
    expect(registration.register).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: 7,
        idempotencyKey: "register-key-1",
        payload: expect.objectContaining({ name: "테스트 업체" }),
        payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it.each([
    ["PROCESSING", 202, "PROCESSING"],
    ["RETRYABLE", 503, "RETRYABLE_FAILURE"],
    ["TERMINAL", 422, "TERMINAL_FAILURE"],
    ["INVALID", 400, "INVALID_INPUT"],
    ["EXPIRED", 410, "SESSION_EXPIRED"],
    ["UPLOAD_EXPIRED", 410, "UPLOAD_EXPIRED"],
  ] as const)("maps %s to its deterministic API contract", async (kind, status, code) => {
    registration.register.mockResolvedValue({ kind, sessionId });
    const response = await callPost();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code, sessionId });
    expect(response.headers.get("Retry-After")).toBe(
      kind === "PROCESSING" || kind === "RETRYABLE" ? "2" : null,
    );
  });

  it("returns the committed result when the session finished while this request waited", async () => {
    registration.register.mockResolvedValue({
      kind: "REPLAY",
      result: {
        sessionId,
        merchantId: 11,
        statusUrl: `/api/v1/merchant-registration-sessions/${sessionId}`,
      },
    });
    const response = await callPost();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ code: "COMMITTED", merchantId: 11 });
  });

  it.each([
    ["SESSION_FORBIDDEN", 403],
    ["UPLOAD_FORBIDDEN", 403],
    ["BOOTH_NOT_FOUND", 404],
    ["SESSION_NOT_FOUND", 404],
  ] as const)("maps %s to %i without session details", async (kind, status) => {
    registration.register.mockResolvedValue({ kind });
    const response = await callPost();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ code: kind, message: expect.any(String) });
  });
});
