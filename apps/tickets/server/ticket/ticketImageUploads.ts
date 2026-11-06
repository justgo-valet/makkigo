import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "database";

import { copyUpload, createUploadPost, deleteUpload, inspectUpload } from "./s3ImageStorage";

import type { TicketImageMimeType } from "@/libs/ticket/contracts";

const UPLOAD_TTL_MS = 5 * 60 * 1000;
const extensions: Record<TicketImageMimeType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const reserveTicketImageUpload = async (input: {
  staffId: number;
  merchantId: number;
  contentType: TicketImageMimeType;
  size: number;
}) => {
  const merchant = await prisma.merchant.findFirst({
    where: { id: input.merchantId, adminId: input.staffId, deletedAt: null },
    select: { id: true },
  });
  if (!merchant) return { kind: "MERCHANT_NOT_FOUND" as const };

  const id = randomUUID();
  const file = `${input.staffId}/${merchant.id}/${id}.${extensions[input.contentType]}`;
  const stagingKey = `tickets/staging/${file}`;
  await prisma.ticketImageUpload.create({
    data: {
      id,
      merchantId: merchant.id,
      staffId: input.staffId,
      stagingKey,
      finalKey: `tickets/final/${file}`,
      contentType: input.contentType,
      size: input.size,
      expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
    },
  });
  try {
    return { kind: "RESERVED" as const, uploadId: id, upload: await createUploadPost(stagingKey, input.contentType) };
  } catch (error) {
    await prisma.ticketImageUpload.delete({ where: { id } });
    throw error;
  }
};

const completeTicketImageUpload = async (input: { staffId: number; uploadId: string }) => {
  const upload = await prisma.ticketImageUpload.findUnique({ where: { id: input.uploadId } });
  if (!upload || upload.staffId !== input.staffId) return { kind: "NOT_FOUND" as const };
  if (upload.state === "COMPLETE") return { kind: "COMPLETE" as const, assetPath: upload.finalKey };
  if (upload.expiresAt <= new Date()) return { kind: "EXPIRED" as const };

  const contentType = upload.contentType as TicketImageMimeType;
  const sourceETag = await inspectUpload(upload.stagingKey, { size: upload.size, contentType });
  const finalETag = await copyUpload({
    sourceKey: upload.stagingKey,
    destinationKey: upload.finalKey,
    sourceETag,
    contentType,
  });
  const claimed = await prisma.ticketImageUpload.updateMany({
    where: { id: upload.id, state: "RESERVED" },
    data: { state: "COMPLETE", sourceETag, finalETag },
  });
  if (claimed.count === 0) {
    const latest = await prisma.ticketImageUpload.findUnique({ where: { id: upload.id }, select: { state: true } });
    if (latest?.state !== "COMPLETE") return { kind: "CONFLICT" as const };
  }
  await deleteUpload(upload.stagingKey).catch((error: unknown) => {
    console.error("Failed to delete ticket staging image", { errorName: error instanceof Error ? error.name : "UnknownError" });
  });
  return { kind: "COMPLETE" as const, assetPath: upload.finalKey };
};

export { completeTicketImageUpload, reserveTicketImageUpload };
