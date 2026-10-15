import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const access = vi.hoisted(() => ({ getMerchantRegistrationAccess: vi.fn() }));
const sessions = vi.hoisted(() => ({ reserveAndSign: vi.fn() }));
const storage = vi.hoisted(() => ({ create: vi.fn(() => ({ createUploadPost: vi.fn() })) }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.getCurrentStaffId }));
vi.mock("@/server/onboarding/getMerchantRegistrationAccess", () => ({
  getMerchantRegistrationAccess: access.getMerchantRegistrationAccess,
}));
vi.mock("@/server/merchantUploads/merchantUploadSessions", () => ({
  prismaMerchantUploadSessionRepository: {},
  createMerchantUploadSessionService: () => sessions,
}));
vi.mock("@/server/merchantUploads/s3MerchantUploadStorage", () => ({
  createS3MerchantUploadStorage: storage.create,
}));

import { NextRequest } from "next/server";

import { POST } from "./route";

const sessionId = "018f47a3-7b4c-7b1f-8db8-743c634d9651";
const callPost = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/v1/merchant-image-uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/v1/merchant-image-uploads/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    access.getMerchantRegistrationAccess.mockResolvedValue({ ok: true });
  });

  it("denies approval-pending users before reserving a row or constructing S3", async () => {
    access.getMerchantRegistrationAccess.mockResolvedValue({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });
    const response = await callPost({ sessionId, contentType: "image/png", size: 1 });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "MERCHANT_APPROVAL_PENDING" });
    expect(storage.create).not.toHaveBeenCalled();
    expect(sessions.reserveAndSign).not.toHaveBeenCalled();
  });

  it.each([
    { sessionId, contentType: "image/gif", size: 1 },
    { sessionId, contentType: "image/png", size: 0 },
    { sessionId, contentType: "image/png", size: 5_242_881 },
    { sessionId: "../foreign", contentType: "image/png", size: 1 },
  ])("rejects an invalid reservation without S3 side effects", async (body) => {
    const response = await callPost(body);
    expect(response.status).toBe(400);
    expect(storage.create).not.toHaveBeenCalled();
    expect(sessions.reserveAndSign).not.toHaveBeenCalled();
  });

  it("returns only the staging POST issued by the service", async () => {
    sessions.reserveAndSign.mockResolvedValue({
      kind: "SIGNED",
      upload: {
        id: "018f47a3-7b4c-7b1f-8db8-743c634d9652",
        slot: 0,
        expiresAt: new Date("2026-10-12T00:05:00.000Z"),
      },
      post: { url: "https://s3.example", fields: { key: "merchants/staging/key.png" } },
    });
    const response = await callPost({ sessionId, contentType: "image/png", size: 12 });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      code: "UPLOAD_RESERVED",
      uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9652",
      slot: 0,
      expiresAt: "2026-10-12T00:05:00.000Z",
      upload: { url: "https://s3.example", fields: { key: "merchants/staging/key.png" } },
    });
  });

  it("reports full capacity without constructing a browser policy", async () => {
    sessions.reserveAndSign.mockResolvedValue({ kind: "SLOTS_FULL" });
    const response = await callPost({ sessionId, contentType: "image/png", size: 12 });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SLOTS_FULL" });
  });

  it("refreshes a policy for the same issued upload ID", async () => {
    const uploadId = "018f47a3-7b4c-7b1f-8db8-743c634d9652";
    sessions.reserveAndSign.mockResolvedValue({
      kind: "SIGNED",
      upload: { id: uploadId, slot: 0, expiresAt: new Date("2026-10-12T00:05:00.000Z") },
      post: { url: "https://s3.example", fields: { key: "merchants/staging/key.png" } },
    });
    const response = await callPost({
      sessionId,
      uploadId,
      contentType: "image/png",
      size: 12,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      code: "UPLOAD_POST_REFRESHED",
      uploadId,
    });
    expect(sessions.reserveAndSign).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId }),
    );
  });
});
