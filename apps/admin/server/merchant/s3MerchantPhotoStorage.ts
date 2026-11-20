import "server-only";

import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { MAX_MERCHANT_PHOTO_BYTES } from "@/libs/merchant/contracts";

import type { MerchantPhotoMimeType } from "@/libs/merchant/contracts";

let client: S3Client | undefined;

const getStorage = () => {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_IMAGE_BUCKET;
  if (!region || !bucket) throw new Error("AWS_REGION and S3_IMAGE_BUCKET are required");
  client ??= new S3Client({ region, maxAttempts: 2 });
  return { client, bucket };
};

const hasSignature = (bytes: Uint8Array, contentType: MerchantPhotoMimeType) => {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  }
  return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
};

const isMissingObjectError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "NotFound" ||
    error.name === "NoSuchKey" ||
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404);

const createUploadPost = (key: string, contentType: MerchantPhotoMimeType) => {
  const { client, bucket } = getStorage();
  return createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Expires: 300,
    Fields: { "Content-Type": contentType },
    Conditions: [
      ["eq", "$key", key],
      ["eq", "$Content-Type", contentType],
      ["content-length-range", 1, MAX_MERCHANT_PHOTO_BYTES],
    ],
  });
};

const inspectUpload = async (key: string, contentType: MerchantPhotoMimeType) => {
  const { client, bucket } = getStorage();
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch((error: unknown) => {
    if (isMissingObjectError(error)) return null;
    throw error;
  });
  if (!head) return null;
  const size = head.ContentLength ?? 0;
  if (size < 1 || size > MAX_MERCHANT_PHOTO_BYTES || head.ContentType !== contentType || !head.ETag) {
    return null;
  }
  const object = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-11", IfMatch: head.ETag }),
  );
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes || bytes.length < 12 || !hasSignature(bytes, contentType)) return null;
  return head.ETag;
};

const copyUpload = async (input: {
  sourceKey: string;
  destinationKey: string;
  sourceETag: string;
  contentType: MerchantPhotoMimeType;
}) => {
  const { client, bucket } = getStorage();
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: input.destinationKey,
      CopySource: `${bucket}/${input.sourceKey.split("/").map(encodeURIComponent).join("/")}`,
      CopySourceIfMatch: input.sourceETag,
      ContentType: input.contentType,
      MetadataDirective: "REPLACE",
    }),
  );
};

const deleteObject = async (key: string) => {
  const { client, bucket } = getStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch((error: unknown) => {
    if (!isMissingObjectError(error)) throw error;
  });
};

export { copyUpload, createUploadPost, deleteObject, inspectUpload };
