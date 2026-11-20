import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "database";

import { MAX_MERCHANT_PHOTOS } from "@/libs/merchant/contracts";

import { copyUpload, createUploadPost, deleteObject, inspectUpload } from "./s3MerchantPhotoStorage";

import type { MerchantPhotoMimeType } from "@/libs/merchant/contracts";

const extensions: Record<MerchantPhotoMimeType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const contentTypes: Record<string, MerchantPhotoMimeType> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

const logStorageError = (message: string) => (error: unknown) => {
  console.error(message, { errorName: error instanceof Error ? error.name : "UnknownError" });
};

const countPhotos = async (merchantId: number) => {
  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, deletedAt: null },
    select: { _count: { select: { photos: true } } },
  });
  return merchant ? merchant._count.photos : null;
};

const presignMerchantPhoto = async (merchantId: number, contentType: MerchantPhotoMimeType) => {
  const count = await countPhotos(merchantId);
  if (count === null) return { kind: "MERCHANT_NOT_FOUND" as const };
  if (count >= MAX_MERCHANT_PHOTOS) return { kind: "TOO_MANY_PHOTOS" as const };
  const key = `merchants/staging/${randomUUID()}.${extensions[contentType]}`;
  return { kind: "READY" as const, key, upload: await createUploadPost(key, contentType) };
};

const completeMerchantPhoto = async (merchantId: number, stagingKey: string) => {
  const count = await countPhotos(merchantId);
  if (count === null) return { kind: "MERCHANT_NOT_FOUND" as const };
  if (count >= MAX_MERCHANT_PHOTOS) return { kind: "TOO_MANY_PHOTOS" as const };

  const file = stagingKey.slice("merchants/staging/".length);
  const contentType = contentTypes[file.split(".")[1] ?? ""];
  if (!contentType) return { kind: "INVALID_UPLOAD" as const };
  const sourceETag = await inspectUpload(stagingKey, contentType);
  if (!sourceETag) return { kind: "INVALID_UPLOAD" as const };

  const path = `merchants/final/${merchantId}/${file}`;
  await copyUpload({ sourceKey: stagingKey, destinationKey: path, sourceETag, contentType });
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM merchants WHERE id = ${merchantId} AND deleted_at IS NULL FOR UPDATE`;
    if (locked.length === 0) return { kind: "MERCHANT_NOT_FOUND" as const };
    const existing = await tx.merchantPhoto.findFirst({ where: { merchantId, path }, select: { id: true } });
    if (existing) return { kind: "COMPLETE" as const, id: existing.id };
    const photos = await tx.merchantPhoto.aggregate({
      where: { merchantId },
      _count: true,
      _max: { sortOrder: true },
    });
    if (photos._count >= MAX_MERCHANT_PHOTOS) return { kind: "TOO_MANY_PHOTOS" as const };
    const photo = await tx.merchantPhoto.create({
      data: { merchantId, path, sortOrder: (photos._max.sortOrder ?? -1) + 1 },
      select: { id: true },
    });
    return { kind: "COMPLETE" as const, id: photo.id };
  });
  if (result.kind !== "COMPLETE") {
    await deleteObject(path).catch(logStorageError("Failed to delete rejected merchant photo"));
    return result;
  }
  await deleteObject(stagingKey).catch(logStorageError("Failed to delete merchant staging photo"));
  return result;
};

const deleteMerchantPhoto = async (merchantId: number, photoId: number) => {
  const photo = await prisma.merchantPhoto.findFirst({ where: { id: photoId, merchantId }, select: { path: true } });
  if (!photo) return false;
  const { count } = await prisma.merchantPhoto.deleteMany({ where: { id: photoId, merchantId } });
  if (count === 0) return false;
  if (photo.path.startsWith("merchants/")) {
    await deleteObject(photo.path).catch(logStorageError("Failed to delete merchant photo"));
  }
  return true;
};

const reorderMerchantPhotos = (merchantId: number, photoIds: number[]) =>
  prisma.$transaction(async (tx) => {
    const photos = await tx.merchantPhoto.findMany({ where: { merchantId }, select: { id: true } });
    const current = new Set(photos.map(({ id }) => id));
    if (photoIds.length !== current.size || new Set(photoIds).size !== photoIds.length) return false;
    if (!photoIds.every((id) => current.has(id))) return false;
    for (const [sortOrder, id] of photoIds.entries()) {
      await tx.merchantPhoto.update({ where: { id }, data: { sortOrder } });
    }
    return true;
  });

export { completeMerchantPhoto, deleteMerchantPhoto, presignMerchantPhoto, reorderMerchantPhotos };
