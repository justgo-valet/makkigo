import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadStorage = vi.hoisted(() => ({
  createUploadPost: vi.fn(),
  inspectObject: vi.fn(),
  copyUpload: vi.fn(),
  deleteObject: vi.fn(),
}));
vi.mock("server-only", () => ({}));

import { createBoothPhotoStorage, boothPhotoKeys } from "./s3BoothPhotoStorage";

describe("S3 booth photo storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadStorage.createUploadPost.mockResolvedValue({ url: "https://s3.example.test", fields: { key: "staging" } });
    uploadStorage.inspectObject.mockResolvedValue({ etag: '"source"' });
    uploadStorage.copyUpload.mockResolvedValue({ etag: '"final"' });
    uploadStorage.deleteObject.mockResolvedValue(undefined);
  });

  it("creates a short-lived post scoped to an owned staging key", async () => {
    const storage = createBoothPhotoStorage({ storage: uploadStorage });
    const upload = { uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651", contentType: "image/jpeg" as const, size: 3 };

    await storage.createUploadPost(7, upload);

    expect(uploadStorage.createUploadPost).toHaveBeenCalledWith({
      key: "booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg",
      contentType: "image/jpeg",
      expiresInSeconds: 300,
    });
  });

  it("inspects and conditionally promotes the staging object", async () => {
    const storage = createBoothPhotoStorage({ storage: uploadStorage });
    const upload = { uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651", contentType: "image/jpeg" as const, size: 3 };

    await expect(storage.promote(7, upload)).resolves.toEqual({
      stagingKey: "booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg",
      finalKey: "booths/final/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg",
    });
    expect(uploadStorage.inspectObject).toHaveBeenCalledWith(
      "booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg",
      { size: 3, contentType: "image/jpeg" },
      expect.any(AbortSignal),
    );
    expect(uploadStorage.copyUpload).toHaveBeenCalledWith(expect.objectContaining({
      sourceKey: "booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg",
      destinationKey: "booths/final/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg",
      sourceETag: '"source"',
      sessionId: upload.uploadId,
      uploadId: upload.uploadId,
      abortSignal: expect.any(AbortSignal),
    }));
  });

  it("deletes an exact object key with a bounded request", async () => {
    const storage = createBoothPhotoStorage({ storage: uploadStorage });

    await storage.delete("booths/staging/7/photo.jpg");

    expect(uploadStorage.deleteObject).toHaveBeenCalledWith({
      key: "booths/staging/7/photo.jpg",
      abortSignal: expect.any(AbortSignal),
    });
  });

  it("builds separate staging and final prefixes", () => {
    expect(boothPhotoKeys(7, {
      uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
      contentType: "image/webp",
      size: 8,
    })).toEqual({
      stagingKey: "booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.webp",
      finalKey: "booths/final/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.webp",
    });
  });
});
