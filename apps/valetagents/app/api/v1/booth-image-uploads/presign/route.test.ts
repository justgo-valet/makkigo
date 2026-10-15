import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ staffId: vi.fn(), role: vi.fn(), eligibility: vi.fn() }));
const storage = vi.hoisted(() => ({ createUploadPost: vi.fn() }));
vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: auth.staffId }));
vi.mock("@/server/auth/getActiveStaffRole", () => ({ getActiveStaffRole: auth.role }));
vi.mock("@/server/booth/createBooth", () => ({ getCreateBoothPreflightFailure: auth.eligibility }));
vi.mock("@/server/booth/s3BoothPhotoStorage", () => ({ createBoothPhotoStorage: () => storage }));

import { NextRequest } from "next/server";

import { POST } from "./route";

const callPost = (body: unknown) => POST(new NextRequest("http://localhost/api/v1/booth-image-uploads/presign", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" },
  body: JSON.stringify(body),
}));

describe("POST /api/v1/booth-image-uploads/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.staffId.mockResolvedValue(7);
    auth.role.mockResolvedValue("VALET_AGENT");
    auth.eligibility.mockResolvedValue(null);
    storage.createUploadPost.mockResolvedValue({ url: "https://s3.example.test", fields: { key: "staging/key" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns short-lived presigned forms for validated photo metadata", async () => {
    const response = await callPost({ uploads: [{ contentType: "image/jpeg", size: 3 }] });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.uploads).toHaveLength(1);
    expect(payload.uploads[0]).toMatchObject({
      contentType: "image/jpeg",
      size: 3,
      post: { url: "https://s3.example.test", fields: { key: "staging/key" } },
    });
    expect(payload.uploads[0].uploadId).toMatch(/^[\da-f-]{36}$/i);
    expect(storage.createUploadPost).toHaveBeenCalledWith(7, expect.objectContaining({ uploadId: payload.uploads[0].uploadId }));
  });

  it("rejects invalid metadata before creating an upload policy", async () => {
    const response = await callPost({ uploads: [{ contentType: "image/gif", size: 1 }] });

    expect(response.status).toBe(400);
    expect(storage.createUploadPost).not.toHaveBeenCalled();
  });

  it("does not issue upload policies to an ineligible agent", async () => {
    auth.eligibility.mockResolvedValue("ALREADY_ONBOARDED");

    const response = await callPost({ uploads: [{ contentType: "image/jpeg", size: 3 }] });

    expect(response.status).toBe(403);
    expect(storage.createUploadPost).not.toHaveBeenCalled();
  });
});
