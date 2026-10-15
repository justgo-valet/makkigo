import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

import {
  createS3MerchantUploadStorage,
  hasSignature,
  isMissingObjectError,
  readRequiredConfig,
  StaleMerchantUploadError,
} from "./s3MerchantUploadStorage";

describe("S3 merchant upload storage", () => {
  const send = vi.fn();
  const signer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AWS_REGION = "ap-northeast-2";
    process.env.S3_IMAGE_BUCKET = "private-images";
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.S3_IMAGE_BUCKET;
  });

  it("fails closed when required configuration is missing", () => {
    delete process.env.S3_IMAGE_BUCKET;
    expect(readRequiredConfig).toThrow("AWS_REGION and S3_IMAGE_BUCKET are required");
  });

  it("signs an exact POST key, MIME and 1..5 MiB byte range", async () => {
    signer.mockResolvedValue({ url: "https://upload.example", fields: { key: "staging/key" } });
    const storage = createS3MerchantUploadStorage({
      client: { send },
      signer: signer as never,
    });

    await expect(
      storage.createUploadPost({
        key: "merchants/staging/7/session/upload.webp",
        contentType: "image/webp",
        expiresInSeconds: 300,
      }),
    ).resolves.toMatchObject({ url: "https://upload.example" });
    expect(signer).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Bucket: "private-images",
        Key: "merchants/staging/7/session/upload.webp",
        Expires: 300,
        Fields: { "Content-Type": "image/webp" },
        Conditions: [
          ["eq", "$key", "merchants/staging/7/session/upload.webp"],
          ["eq", "$Content-Type", "image/webp"],
          ["content-length-range", 1, 5_242_880],
        ],
      }),
    );
  });

  it("heads and range-reads an object before accepting its signature", async () => {
    send
      .mockResolvedValueOnce({
        ContentLength: 12,
        ContentType: "image/webp",
        ETag: '"source"',
        Metadata: { client: "ignored" },
      })
      .mockResolvedValueOnce({
        Body: {
          transformToByteArray: async () =>
            Uint8Array.from([82, 73, 70, 70, 1, 2, 3, 4, 87, 69, 66, 80]),
        },
      });
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });

    await expect(
      storage.inspectObject("staging/key", { size: 12, contentType: "image/webp" }),
    ).resolves.toMatchObject({ etag: '"source"', size: 12, contentType: "image/webp" });
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(GetObjectCommand);
    expect((send.mock.calls[1]?.[0] as GetObjectCommand).input.Range).toBe("bytes=0-11");
  });

  it("rejects mismatched metadata and signatures", async () => {
    send.mockResolvedValueOnce({
      ContentLength: 11,
      ContentType: "image/png",
      ETag: '"source"',
    });
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });
    await expect(
      storage.inspectObject("staging/key", { size: 12, contentType: "image/png" }),
    ).rejects.toThrow("metadata");
  });

  it("copies create-only from the immutable source and replaces client metadata", async () => {
    send
      .mockResolvedValueOnce({ CopyObjectResult: { ETag: '"final"' } })
      .mockResolvedValueOnce({
        ContentLength: 3,
        ContentType: "image/jpeg",
        ETag: '"final"',
        Metadata: { sessionid: "session", uploadid: "upload", sourceetag: '"source"' },
      })
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => Uint8Array.from([0xff, 0xd8, 0xff]) },
      });
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });

    await expect(
      storage.copyUpload({
        sourceKey: "merchants/staging/a b.jpg",
        destinationKey: "merchants/final/upload.jpg",
        sourceETag: '"source"',
        contentType: "image/jpeg",
        size: 3,
        sessionId: "session",
        uploadId: "upload",
      }),
    ).resolves.toEqual({ etag: '"final"' });
    const command = send.mock.calls[0]?.[0] as CopyObjectCommand;
    expect(command).toBeInstanceOf(CopyObjectCommand);
    expect(command.input).toMatchObject({
      CopySource: "private-images/merchants/staging/a%20b.jpg",
      CopySourceIfMatch: '"source"',
      IfNoneMatch: "*",
      MetadataDirective: "REPLACE",
      Metadata: { sessionid: "session", uploadid: "upload", sourceetag: '"source"' },
    });
  });

  it("accepts a conditional-copy conflict only after verifying the existing destination", async () => {
    send
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 412 } })
      .mockResolvedValueOnce({
        ContentLength: 3,
        ContentType: "image/jpeg",
        ETag: '"existing"',
        Metadata: { sessionid: "session", uploadid: "upload", sourceetag: '"source"' },
      })
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => Uint8Array.from([0xff, 0xd8, 0xff]) },
      });
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });

    await expect(
      storage.copyUpload({
        sourceKey: "staging/source.jpg",
        destinationKey: "final/upload.jpg",
        sourceETag: '"source"',
        contentType: "image/jpeg",
        size: 3,
        sessionId: "session",
        uploadId: "upload",
      }),
    ).resolves.toEqual({ etag: '"existing"' });
  });

  it("retries one transient 409 without removing either copy precondition", async () => {
    send
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 409 } })
      .mockResolvedValueOnce({ CopyObjectResult: { ETag: '"final"' } })
      .mockResolvedValueOnce({
        ContentLength: 3,
        ContentType: "image/jpeg",
        ETag: '"final"',
        Metadata: { sessionid: "session", uploadid: "upload", sourceetag: '"source"' },
      })
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => Uint8Array.from([0xff, 0xd8, 0xff]) },
      });
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });

    await expect(
      storage.copyUpload({
        sourceKey: "staging/source.jpg",
        destinationKey: "final/upload.jpg",
        sourceETag: '"source"',
        contentType: "image/jpeg",
        size: 3,
        sessionId: "session",
        uploadId: "upload",
      }),
    ).resolves.toEqual({ etag: '"final"' });
    const copyCommands = send.mock.calls
      .map(([command]) => command)
      .filter((command) => command instanceof CopyObjectCommand) as CopyObjectCommand[];
    expect(copyCommands).toHaveLength(2);
    expect(copyCommands[1]?.input).toMatchObject({ IfNoneMatch: "*", CopySourceIfMatch: '"source"' });
  });

  it("classifies a replaced source after copy 412 as a definitive stale upload", async () => {
    send
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 412 } })
      .mockRejectedValueOnce({ name: "NotFound", $metadata: { httpStatusCode: 404 } })
      .mockResolvedValueOnce({
        ContentLength: 3,
        ContentType: "image/jpeg",
        ETag: '"replacement"',
      })
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => Uint8Array.from([0xff, 0xd8, 0xff]) },
      });
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });

    await expect(
      storage.copyUpload({
        sourceKey: "staging/source.jpg",
        destinationKey: "final/upload.jpg",
        sourceETag: '"source"',
        contentType: "image/jpeg",
        size: 3,
        sessionId: "session",
        uploadId: "upload",
      }),
    ).rejects.toBeInstanceOf(StaleMerchantUploadError);
  });

  it("deletes by key without an ETag condition", async () => {
    send.mockResolvedValue({});
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });
    await storage.deleteObject({ key: "final/key" });
    const command = send.mock.calls[0]?.[0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: expect.any(String), Key: "final/key" });
  });

  it("treats an already-missing cleanup object as success", async () => {
    const storage = createS3MerchantUploadStorage({ client: { send }, signer: signer as never });
    send.mockRejectedValueOnce({ name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
    await expect(storage.deleteObject({ key: "staging/missing" })).resolves.toBe(undefined);
  });
});

describe("hasSignature", () => {
  it("recognizes supported headers only", () => {
    expect(hasSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg")).toBe(true);
    expect(
      hasSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"),
    ).toBe(true);
    expect(hasSignature(Uint8Array.from([0x47, 0x49, 0x46]), "image/jpeg")).toBe(false);
  });
});

describe("isMissingObjectError", () => {
  it("recognizes SDK 404 shapes without accepting unrelated failures", () => {
    expect(isMissingObjectError({ name: "NotFound" })).toBe(true);
    expect(isMissingObjectError({ $metadata: { httpStatusCode: 404 } })).toBe(true);
    expect(isMissingObjectError({ $metadata: { httpStatusCode: 403 } })).toBe(false);
  });
});
