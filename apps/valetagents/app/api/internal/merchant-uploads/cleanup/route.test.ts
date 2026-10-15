import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const repository = vi.hoisted(() => ({
  expireSessions: vi.fn(),
  inspect: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
}));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn() }));

vi.mock("@/server/merchantUploads/prismaMerchantUploadCleanupRepository", () => ({
  prismaMerchantUploadCleanupRepository: repository,
}));
vi.mock("@/server/merchantUploads/s3MerchantUploadStorage", () => ({
  createS3MerchantUploadStorage: () => storage,
}));

import { NextRequest } from "next/server";

import { POST } from "./route";

const CLEANUP_TOKEN = "a".repeat(32);

const callPost = (body: unknown, token = CLEANUP_TOKEN) =>
  POST(
    new NextRequest("http://valetagents:3000/api/internal/merchant-uploads/cleanup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/internal/merchant-uploads/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCHANT_UPLOAD_CLEANUP_TOKEN = CLEANUP_TOKEN;
    process.env.MERCHANT_UPLOAD_CLEANUP_ENABLED = "false";
    repository.inspect.mockResolvedValue({ eligibleCount: 2, oldestEligibleAt: null });
    repository.claim.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.MERCHANT_UPLOAD_CLEANUP_TOKEN;
    delete process.env.MERCHANT_UPLOAD_CLEANUP_ENABLED;
  });

  it("checks the bearer token before parsing the body", async () => {
    const response = await callPost({ invalid: true }, "wrong");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(repository.inspect).not.toHaveBeenCalled();
  });

  it("fails closed when the configured token is shorter than 256 bits", async () => {
    process.env.MERCHANT_UPLOAD_CLEANUP_TOKEN = "short-token";
    const response = await callPost({ dryRun: true }, "short-token");
    expect(response.status).toBe(401);
    expect(repository.inspect).not.toHaveBeenCalled();
  });

  it("does not accept a staff cookie instead of the cleanup token", async () => {
    const request = new NextRequest(
      "http://valetagents:3000/api/internal/merchant-uploads/cleanup",
      {
        method: "POST",
        headers: { Cookie: "staff_access_token=valid-user-cookie" },
        body: JSON.stringify({ dryRun: true }),
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(repository.inspect).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { dryRun: "true" },
    { dryRun: true, batchSize: 0 },
    { dryRun: true, batchSize: 101 },
    { dryRun: true, unexpected: true },
  ])("rejects invalid body %# before the kill switch", async (body) => {
    const response = await callPost(body);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(repository.inspect).not.toHaveBeenCalled();
  });

  it("returns 503 for execute while disabled with zero side effects", async () => {
    const response = await callPost({ dryRun: false, batchSize: 100 });
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "CLEANUP_DISABLED" });
    expect(repository.inspect).not.toHaveBeenCalled();
    expect(repository.claim).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("allows authenticated read-only dry-run while disabled", async () => {
    const response = await callPost({ dryRun: true, batchSize: 100 });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      dryRun: true,
      eligibleCount: 2,
      claimed: 0,
    });
    expect(repository.inspect).toHaveBeenCalledTimes(1);
    expect(repository.claim).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("executes through the claim service only when enabled", async () => {
    process.env.MERCHANT_UPLOAD_CLEANUP_ENABLED = "true";
    const response = await callPost({ dryRun: false, batchSize: 25 });
    expect(response.status).toBe(200);
    expect(repository.claim).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });
});
