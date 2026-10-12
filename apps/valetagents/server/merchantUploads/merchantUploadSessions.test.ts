import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({
  prisma: {},
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" }, sql: vi.fn() },
}));
vi.mock("database", () => database);

import {
  buildMerchantUploadKeys,
  createMerchantUploadSessionService,
  extensionForMimeType,
  serializeSession,
} from "./merchantUploadSessions";

import type { MerchantUploadSessionRepository } from "./merchantUploadSessions";

const fixedNow = new Date("2026-10-12T00:00:00.000Z");
const uploadId = "018f47a3-7b4c-7b1f-8db8-743c634d9650";
const repository = (): MerchantUploadSessionRepository => ({
  createOrResume: vi.fn(),
  getOwned: vi.fn(),
  reserve: vi.fn().mockResolvedValue({
    kind: "RESERVED",
    upload: {
      id: uploadId,
      slot: 0,
      stagingKey: `merchants/staging/7/session/${uploadId}.webp`,
      finalKey: `merchants/final/7/session/${uploadId}.webp`,
      expiresAt: new Date(fixedNow.getTime() + 5 * 60 * 1_000),
    },
  }),
  revoke: vi.fn(),
  abandonReservation: vi.fn(),
});

describe("merchant upload session service", () => {
  const storage = { createUploadPost: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  it("signs only the repository-issued staging key for at most five minutes", async () => {
    const repo = repository();
    storage.createUploadPost.mockResolvedValue({
      url: "https://s3.example",
      fields: { key: `merchants/staging/7/session/${uploadId}.webp` },
    });
    const service = createMerchantUploadSessionService({
      repository: repo,
      storage,
      now: () => fixedNow,
      createId: () => uploadId,
    });

    await expect(
      service.reserveAndSign({
        staffId: 7,
        sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
        contentType: "image/webp",
        size: 100,
      }),
    ).resolves.toMatchObject({ kind: "SIGNED", upload: { id: uploadId, slot: 0 } });
    expect(repo.reserve).toHaveBeenCalledWith(expect.objectContaining({ uploadId, staffId: 7 }));
    expect(storage.createUploadPost).toHaveBeenCalledWith({
      key: `merchants/staging/7/session/${uploadId}.webp`,
      contentType: "image/webp",
      expiresInSeconds: 300,
    });
  });

  it("irreversibly revokes a reservation when signing fails", async () => {
    const repo = repository();
    storage.createUploadPost.mockRejectedValue(new Error("credentials unavailable"));
    const service = createMerchantUploadSessionService({
      repository: repo,
      storage,
      now: () => fixedNow,
      createId: () => uploadId,
    });

    await expect(
      service.reserveAndSign({
        staffId: 7,
        sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
        contentType: "image/webp",
        size: 100,
      }),
    ).rejects.toThrow("credentials unavailable");
    expect(repo.abandonReservation).toHaveBeenCalledWith({ uploadId, now: fixedNow });
  });

  it("does not call S3 when reservation is denied", async () => {
    const repo = repository();
    vi.mocked(repo.reserve).mockResolvedValue({ kind: "SLOTS_FULL" });
    const service = createMerchantUploadSessionService({
      repository: repo,
      storage,
      now: () => fixedNow,
      createId: () => uploadId,
    });
    await expect(
      service.reserveAndSign({
        staffId: 7,
        sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
        contentType: "image/png",
        size: 1,
      }),
    ).resolves.toEqual({ kind: "SLOTS_FULL" });
    expect(storage.createUploadPost).not.toHaveBeenCalled();
  });

  it("refreshes the same upload ID and never allocates a replacement key", async () => {
    const repo = repository();
    const createId = vi.fn(() => "should-not-be-used");
    storage.createUploadPost.mockResolvedValue({ url: "https://s3.example", fields: {} });
    const service = createMerchantUploadSessionService({
      repository: repo,
      storage,
      now: () => fixedNow,
      createId,
    });
    await service.reserveAndSign({
      staffId: 7,
      sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
      uploadId,
      contentType: "image/webp",
      size: 100,
    });
    expect(createId).not.toHaveBeenCalled();
    expect(repo.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId, refresh: true }),
    );
  });
});

describe("merchant upload session helpers", () => {
  it("uses fixed safe extensions instead of client filenames", () => {
    expect(extensionForMimeType("image/jpeg")).toBe("jpg");
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/webp")).toBe("webp");
    expect(
      buildMerchantUploadKeys({
        staffId: 7,
        sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
        uploadId,
        contentType: "image/jpeg",
      }),
    ).toEqual({
      stagingKey:
        "merchants/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651/018f47a3-7b4c-7b1f-8db8-743c634d9650.jpg",
      finalKey:
        "merchants/final/7/018f47a3-7b4c-7b1f-8db8-743c634d9651/018f47a3-7b4c-7b1f-8db8-743c634d9650.jpg",
    });
  });

  it("serializes only authorized status data and the stable status URL", () => {
    expect(
      serializeSession({
        id: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
        state: "OPEN",
        expiresAt: fixedNow,
        merchantId: null,
        replayResponse: null,
      }),
    ).toEqual({
      sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
      state: "OPEN",
      expiresAt: fixedNow.toISOString(),
      statusUrl:
        "/api/v1/merchant-registration-sessions/018f47a3-7b4c-7b1f-8db8-743c634d9651",
    });
  });
});
