import "server-only";

import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { MAX_TICKET_IMAGE_BYTES } from "@/libs/ticket/contracts";

import type { TicketImageMimeType } from "@/libs/ticket/contracts";

let client: S3Client | undefined;

const getStorage = () => {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_IMAGE_BUCKET;
  if (!region || !bucket) throw new Error("AWS_REGION and S3_IMAGE_BUCKET are required");
  client ??= new S3Client({ region, maxAttempts: 2 });
  return { client, bucket };
};

const hasSignature = (bytes: Uint8Array, contentType: TicketImageMimeType) => {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  }
  return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
};

const createUploadPost = (key: string, contentType: TicketImageMimeType) => {
  const { client, bucket } = getStorage();
  return createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Expires: 300,
    Fields: { "Content-Type": contentType },
    Conditions: [
      ["eq", "$key", key],
      ["eq", "$Content-Type", contentType],
      ["content-length-range", 1, MAX_TICKET_IMAGE_BYTES],
    ],
  });
};

const inspectUpload = async (key: string, expected: { size: number; contentType: TicketImageMimeType }) => {
  const { client, bucket } = getStorage();
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentLength !== expected.size || head.ContentType !== expected.contentType || !head.ETag) {
    throw new Error("Uploaded object metadata does not match its reservation");
  }
  const object = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-11", IfMatch: head.ETag }),
  );
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes || bytes.length < 12 || !hasSignature(bytes, expected.contentType)) {
    throw new Error("Uploaded object signature does not match its content type");
  }
  return head.ETag;
};

const copyUpload = async (input: { sourceKey: string; destinationKey: string; sourceETag: string; contentType: TicketImageMimeType }) => {
  const { client, bucket } = getStorage();
  const result = await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: input.destinationKey,
      CopySource: `${bucket}/${input.sourceKey.split("/").map(encodeURIComponent).join("/")}`,
      CopySourceIfMatch: input.sourceETag,
      ContentType: input.contentType,
      MetadataDirective: "REPLACE",
    }),
  );
  const etag = result.CopyObjectResult?.ETag;
  if (!etag) throw new Error("S3 copy completed without a destination ETag");
  return etag;
};

const deleteUpload = async (key: string) => {
  const { client, bucket } = getStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};

export { copyUpload, createUploadPost, deleteUpload, inspectUpload };
