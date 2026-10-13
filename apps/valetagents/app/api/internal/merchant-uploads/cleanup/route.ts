import { randomUUID, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { apiError, privateJson } from "@/server/common/apiResponse";
import { createMerchantUploadCleanupService } from "@/server/merchantUploads/cleanupMerchantUploads";
import { prismaMerchantUploadCleanupRepository } from "@/server/merchantUploads/prismaMerchantUploadCleanupRepository";
import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cleanupBodySchema = z
  .object({
    dryRun: z.boolean(),
    batchSize: z.number().int().min(1).max(100).default(100),
  })
  .strict();

const hasCleanupToken = (request: NextRequest) => {
  const configured = process.env.MERCHANT_UPLOAD_CLEANUP_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const expectedBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length >= 32 &&
    expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
  );
};

export async function POST(request: NextRequest) {
  if (!hasCleanupToken(request)) {
    return apiError("AUTH_REQUIRED", "인증이 필요합니다.", 401);
  }

  const body = cleanupBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다.", 400);

  if (!body.data.dryRun && process.env.MERCHANT_UPLOAD_CLEANUP_ENABLED !== "true") {
    return apiError("CLEANUP_DISABLED", "업로드 정리가 비활성화되어 있습니다.", 503);
  }

  try {
    const storage = body.data.dryRun
      ? { deleteObject: async () => Promise.reject(new Error("dry-run cannot delete objects")) }
      : createS3MerchantUploadStorage();
    const cleanup = createMerchantUploadCleanupService({
      repository: prismaMerchantUploadCleanupRepository,
      storage,
      createClaimId: randomUUID,
    });
    return privateJson(
      await cleanup({
        dryRun: body.data.dryRun,
        batchSize: body.data.batchSize,
        signal: request.signal,
      }),
    );
  } catch (error) {
    console.error("Merchant upload cleanup failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError("CLEANUP_FAILED", "업로드 정리를 완료하지 못했습니다.", 500);
  }
}

