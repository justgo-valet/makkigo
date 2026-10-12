import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("database", () => ({
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
    sql: vi.fn(),
  },
  prisma: {},
}));

import {
  canonicalizeRegistration,
  createMerchantRegistrationService,
  hashRegistrationPayload,
} from "./registerMerchant";

import type { MerchantRegistrationRepository } from "./registerMerchant";

const sessionId = "018f47a3-7b4c-7b1f-8db8-743c634d9650";
const uploadId = "018f47a3-7b4c-7b1f-8db8-743c634d9651";
const payload = canonicalizeRegistration({
  sessionId,
  name: "업체",
  roadAddress: "서울 중구 세종대로 110",
  addressDetail: null,
  postalCode: "04524",
  latitude: 37.5666805,
  longitude: 126.9784147,
  boothId: 3,
  uploadIds: [uploadId],
});

const createRepository = () =>
  ({
    findExisting: vi.fn().mockResolvedValue({ kind: "NONE" }),
    prepare: vi.fn().mockResolvedValue({
      kind: "PREPARED",
      sessionId,
      generation: 1,
      uploads: [
        {
          id: uploadId,
          state: "CLAIMED",
          stagingKey: "staging/source.jpg",
          finalKey: "final/photo.jpg",
          declaredMimeType: "image/jpeg",
          declaredSize: 3,
          sourceETag: null,
          finalETag: null,
        },
      ],
    }),
    recordSource: vi.fn().mockResolvedValue(true),
    recordValidated: vi.fn().mockResolvedValue(true),
    commit: vi.fn().mockResolvedValue({
      kind: "COMMITTED",
      result: { sessionId, merchantId: 9, statusUrl: `/api/v1/merchant-registration-sessions/${sessionId}` },
    }),
    markRetryable: vi.fn().mockResolvedValue(true),
    markFailed: vi.fn().mockResolvedValue(true),
  }) satisfies MerchantRegistrationRepository;

describe("merchant registration canonical identity", () => {
  it("is deterministic and includes ordered upload IDs", () => {
    expect(hashRegistrationPayload(payload)).toBe(hashRegistrationPayload({ ...payload }));
    expect(
      hashRegistrationPayload({ ...payload, uploadIds: [uploadId, sessionId] }),
    ).not.toBe(hashRegistrationPayload({ ...payload, uploadIds: [sessionId, uploadId] }));
  });
});

describe("createMerchantRegistrationService", () => {
  const storage = {
    inspectObject: vi.fn(),
    copyUpload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    storage.inspectObject.mockResolvedValue({
      key: "staging/source.jpg",
      size: 3,
      contentType: "image/jpeg",
      etag: '"source"',
      metadata: {},
    });
    storage.copyUpload.mockResolvedValue({ etag: '"final"' });
  });

  it("validates and promotes outside the repository commit, then returns one result", async () => {
    const repository = createRepository();
    const service = createMerchantRegistrationService({
      repository,
      storage,
      now: () => new Date("2026-10-13T00:00:00.000Z"),
    });

    await expect(
      service.register({
        staffId: 7,
        idempotencyKey: "register-key-1",
        payload,
        payloadHash: hashRegistrationPayload(payload),
      }),
    ).resolves.toEqual({
      kind: "CREATED",
      result: expect.objectContaining({ merchantId: 9, sessionId }),
    });
    expect(storage.inspectObject).toHaveBeenCalledBefore(repository.recordSource);
    expect(storage.copyUpload).toHaveBeenCalledBefore(repository.recordValidated);
    expect(repository.commit).toHaveBeenCalledAfter(repository.recordValidated);
  });

  it("does not repeat external work while another live lease owns processing", async () => {
    const repository = createRepository();
    repository.prepare.mockResolvedValue({ kind: "PROCESSING", sessionId });
    const service = createMerchantRegistrationService({ repository, storage });

    await expect(
      service.register({
        staffId: 7,
        idempotencyKey: "register-key-1",
        payload,
        payloadHash: hashRegistrationPayload(payload),
      }),
    ).resolves.toEqual({ kind: "PROCESSING", sessionId });
    expect(storage.inspectObject).not.toHaveBeenCalled();
  });

  it("retains the frozen attempt as RETRYABLE on provider failure", async () => {
    const repository = createRepository();
    storage.copyUpload.mockRejectedValueOnce(new Error("S3 unavailable"));
    const service = createMerchantRegistrationService({ repository, storage });

    await expect(
      service.register({
        staffId: 7,
        idempotencyKey: "register-key-1",
        payload,
        payloadHash: hashRegistrationPayload(payload),
      }),
    ).resolves.toEqual({ kind: "RETRYABLE", sessionId });
    expect(repository.markRetryable).toHaveBeenCalledWith({ sessionId, generation: 1 });
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it("terminalizes an immutable-source validation failure before cleanup", async () => {
    const repository = createRepository();
    storage.inspectObject.mockRejectedValueOnce(
      new Error("Uploaded object signature does not match its content type"),
    );
    const service = createMerchantRegistrationService({ repository, storage });

    await expect(
      service.register({
        staffId: 7,
        idempotencyKey: "register-key-1",
        payload,
        payloadHash: hashRegistrationPayload(payload),
      }),
    ).resolves.toEqual({ kind: "TERMINAL", sessionId });
    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "UPLOAD_VALIDATION_FAILED" }),
    );
    expect(repository.markRetryable).not.toHaveBeenCalled();
  });

  it("resumes a copied upload without re-inspecting its mutable staging source", async () => {
    const repository = createRepository();
    repository.prepare.mockResolvedValue({
      kind: "PREPARED",
      sessionId,
      generation: 4,
      uploads: [
        {
          id: uploadId,
          state: "COPYING",
          stagingKey: "staging/source.jpg",
          finalKey: "final/photo.jpg",
          declaredMimeType: "image/jpeg",
          declaredSize: 3,
          sourceETag: '"source"',
          finalETag: null,
        },
      ],
    });
    const service = createMerchantRegistrationService({ repository, storage });

    await service.register({
      staffId: 7,
      idempotencyKey: "register-key-1",
      payload,
      payloadHash: hashRegistrationPayload(payload),
    });
    expect(storage.inspectObject).not.toHaveBeenCalled();
    expect(storage.copyUpload).toHaveBeenCalledWith(
      expect.objectContaining({ sourceETag: '"source"' }),
    );
  });
});
