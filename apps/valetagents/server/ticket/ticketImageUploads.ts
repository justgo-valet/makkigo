import "server-only";

import { randomUUID } from "node:crypto";

import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";
import { prisma } from "database";

import type { MerchantImageMimeType } from "@/libs/merchant/contracts/image-upload";
import type { MerchantUploadStorage } from "@/server/merchantUploads/storage";

interface TicketImageUploadDependencies {
  database: typeof prisma;
  createStorage: () => MerchantUploadStorage;
  now: () => Date;
}

const defaultDependencies: TicketImageUploadDependencies = {
  database: prisma,
  createStorage: createS3MerchantUploadStorage,
  now: () => new Date(),
};

const extensionFor = (contentType: MerchantImageMimeType) =>
  contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";

const reserveTicketImageUpload = async (
  input: { staffId: number; merchantId: number; contentType: MerchantImageMimeType; size: number },
  dependencies = defaultDependencies,
) => {
  const merchant = await dependencies.database.merchant.findFirst({
    where: { id: input.merchantId, adminId: input.staffId, deletedAt: null },
    select: { id: true },
  });
  if (!merchant) return { kind: "MERCHANT_NOT_FOUND" as const };

  const id = randomUUID();
  const extension = extensionFor(input.contentType);
  const stagingKey = `tickets/staging/${input.staffId}/${merchant.id}/${id}.${extension}`;
  const finalKey = `tickets/final/${input.staffId}/${merchant.id}/${id}.${extension}`;
  const expiresAt = new Date(dependencies.now().getTime() + 5 * 60 * 1000);
  await dependencies.database.ticketImageUpload.create({
    data: {
      id,
      merchantId: merchant.id,
      staffId: input.staffId,
      stagingKey,
      finalKey,
      contentType: input.contentType,
      size: input.size,
      expiresAt,
    },
  });

  try {
    const upload = await dependencies.createStorage().createUploadPost({
      key: stagingKey,
      contentType: input.contentType,
      expiresInSeconds: 300,
    });
    return { kind: "RESERVED" as const, uploadId: id, expiresAt, upload };
  } catch (error) {
    await dependencies.database.ticketImageUpload.delete({ where: { id } });
    throw error;
  }
};

const completeTicketImageUpload = async (
  input: { staffId: number; uploadId: string },
  dependencies = defaultDependencies,
) => {
  const upload = await dependencies.database.ticketImageUpload.findUnique({ where: { id: input.uploadId } });
  if (!upload) return { kind: "NOT_FOUND" as const };
  if (upload.staffId !== input.staffId) return { kind: "FORBIDDEN" as const };
  if (upload.state === "COMPLETE") return { kind: "COMPLETE" as const, assetPath: upload.finalKey };

  const merchant = await dependencies.database.merchant.findFirst({
    where: { id: upload.merchantId, adminId: input.staffId, deletedAt: null },
    select: { id: true },
  });
  if (!merchant) return { kind: "MERCHANT_NOT_FOUND" as const };
  if (upload.expiresAt <= dependencies.now()) return { kind: "EXPIRED" as const };

  const storage = dependencies.createStorage();
  const contentType = upload.contentType as MerchantImageMimeType;
  const source = await storage.inspectObject(upload.stagingKey, {
    size: upload.size,
    contentType,
  });
  if (upload.sourceETag && upload.sourceETag !== source.etag) return { kind: "CHANGED" as const };
  if (!upload.sourceETag) {
    const claim = await dependencies.database.ticketImageUpload.updateMany({
      where: { id: upload.id, state: "RESERVED", sourceETag: null },
      data: { sourceETag: source.etag },
    });
    if (claim.count === 0) {
      const latest = await dependencies.database.ticketImageUpload.findUnique({ where: { id: upload.id } });
      if (latest?.state === "COMPLETE") return { kind: "COMPLETE" as const, assetPath: latest.finalKey };
      if (latest?.sourceETag !== source.etag) return { kind: "CHANGED" as const };
    }
  }

  const copied = await storage.copyUpload({
    sourceKey: upload.stagingKey,
    destinationKey: upload.finalKey,
    sourceETag: source.etag,
    contentType,
    size: upload.size,
    sessionId: `ticket-${upload.merchantId}`,
    uploadId: upload.id,
  });
  const claimed = await dependencies.database.ticketImageUpload.updateMany({
    where: { id: upload.id, state: "RESERVED", sourceETag: source.etag },
    data: { state: "COMPLETE", finalETag: copied.etag },
  });
  if (claimed.count === 0) {
    const latest = await dependencies.database.ticketImageUpload.findUnique({ where: { id: upload.id } });
    if (latest?.state !== "COMPLETE" || latest.finalETag !== copied.etag) return { kind: "CONFLICT" as const };
  }
  try {
    await storage.deleteObject({ key: upload.stagingKey });
  } catch (error) {
    console.error("Failed to delete ticket staging image", { errorName: error instanceof Error ? error.name : "UnknownError" });
  }
  return { kind: "COMPLETE" as const, assetPath: upload.finalKey };
};

export { completeTicketImageUpload, reserveTicketImageUpload };
export type { TicketImageUploadDependencies };
