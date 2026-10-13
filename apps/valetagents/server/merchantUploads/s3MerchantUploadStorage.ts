import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { MAX_MERCHANT_IMAGE_BYTES } from "@/libs/merchant/contracts/image-upload";

import type {
  CopyObjectCommandInput,
  GetObjectCommandOutput,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import type { MerchantImageMimeType } from "@/libs/merchant/contracts/image-upload";
import type { MerchantUploadStorage } from "./storage";

interface S3CommandTransport {
  send(command: unknown, options?: { abortSignal?: AbortSignal }): Promise<unknown>;
}

type PresignedPostSigner = typeof createPresignedPost;

interface S3MerchantUploadStorageOptions {
  bucket: string;
  client: S3CommandTransport;
  signer: PresignedPostSigner;
}

const readRequiredConfig = () => {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_IMAGE_BUCKET;
  if (!region || !bucket) throw new Error("AWS_REGION and S3_IMAGE_BUCKET are required");
  return { region, bucket };
};

const hasSignature = (bytes: Uint8Array, contentType: MerchantImageMimeType) => {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= png.length && png.every((byte, index) => bytes[index] === byte);
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
};

const encodeCopySource = (bucket: string, key: string) =>
  `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

const isMissingObjectError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return (
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound" ||
    candidate.$metadata?.httpStatusCode === 404
  );
};

const httpStatusOf = (error: unknown) =>
  error && typeof error === "object"
    ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    : undefined;

class StaleMerchantUploadError extends Error {
  override name = "StaleMerchantUploadError";
}

let sharedClient: S3CommandTransport | undefined;

const createS3MerchantUploadStorage = (
  options?: Partial<S3MerchantUploadStorageOptions>,
): MerchantUploadStorage => {
  const config = readRequiredConfig();
  const bucket = options?.bucket ?? config.bucket;
  const client =
    options?.client ??
    (sharedClient ??= new S3Client({
      region: config.region,
      maxAttempts: 2,
    }) as unknown as S3CommandTransport);
  const signer = options?.signer ?? createPresignedPost;

  return {
    async createUploadPost({ key, contentType, expiresInSeconds }) {
      if (expiresInSeconds < 1 || expiresInSeconds > 300) {
        throw new Error("Upload policy expiry must be between 1 and 300 seconds");
      }
      return signer(client as never, {
        Bucket: bucket,
        Key: key,
        Expires: expiresInSeconds,
        Fields: { "Content-Type": contentType },
        Conditions: [
          ["eq", "$key", key],
          ["eq", "$Content-Type", contentType],
          ["content-length-range", 1, MAX_MERCHANT_IMAGE_BYTES],
        ],
      });
    },

    async inspectObject(key, expected, abortSignal) {
      const head = (await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
        { abortSignal },
      )) as HeadObjectCommandOutput;
      if (
        head.ContentLength !== expected.size ||
        head.ContentType !== expected.contentType ||
        !head.ETag
      ) {
        throw new Error("Uploaded object metadata does not match its reservation");
      }

      const object = (await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-11" }),
        { abortSignal },
      )) as GetObjectCommandOutput;
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes || !hasSignature(bytes, expected.contentType)) {
        throw new Error("Uploaded object signature does not match its content type");
      }

      return {
        key,
        size: expected.size,
        contentType: expected.contentType,
        etag: head.ETag,
        metadata: head.Metadata ?? {},
      };
    },

    async copyUpload(input) {
      const commandInput = {
        Bucket: bucket,
        Key: input.destinationKey,
        CopySource: encodeCopySource(bucket, input.sourceKey),
        CopySourceIfMatch: input.sourceETag,
        IfNoneMatch: "*",
        ContentType: input.contentType,
        MetadataDirective: "REPLACE",
        Metadata: {
          sessionid: input.sessionId,
          uploadid: input.uploadId,
          sourceetag: input.sourceETag,
        },
      } satisfies CopyObjectCommandInput;
      const verifyDestination = async () => {
        const destination = await this.inspectObject(
          input.destinationKey,
          { size: input.size, contentType: input.contentType },
          input.abortSignal,
        );
        if (
          destination.metadata.sessionid !== input.sessionId ||
          destination.metadata.uploadid !== input.uploadId ||
          destination.metadata.sourceetag !== input.sourceETag
        ) {
          throw new Error("Existing destination does not match the immutable upload manifest");
        }
        return { etag: destination.etag };
      };

      const executeCopy = async () => {
        const result = (await client.send(new CopyObjectCommand(commandInput), {
          abortSignal: input.abortSignal,
        })) as { CopyObjectResult?: { ETag?: string } };
        const etag = result.CopyObjectResult?.ETag;
        if (!etag) throw new Error("S3 copy completed without a destination ETag");
        const verified = await verifyDestination();
        if (verified.etag !== etag) {
          throw new Error("Destination changed while copy verification was in progress");
        }
        return verified;
      };

      try {
        return await executeCopy();
      } catch (error) {
        let copyError = error;
        if (httpStatusOf(copyError) === 409) {
          try {
            return await executeCopy();
          } catch (retryError) {
            copyError = retryError;
          }
        }
        const status = httpStatusOf(copyError);
        if (status !== 409 && status !== 412) throw copyError;
        try {
          return await verifyDestination();
        } catch (destinationError) {
          if (status === 412) {
            try {
              const source = await this.inspectObject(
                input.sourceKey,
                { size: input.size, contentType: input.contentType },
                input.abortSignal,
              );
              if (source.etag !== input.sourceETag) {
                throw new StaleMerchantUploadError("Staging object changed after validation");
              }
            } catch (sourceError) {
              if (sourceError instanceof StaleMerchantUploadError) throw sourceError;
              const sourceStatus = httpStatusOf(sourceError);
              if (sourceStatus === 403 || (sourceStatus !== undefined && sourceStatus >= 500)) {
                throw sourceError;
              }
              throw new StaleMerchantUploadError(
                "Staging object is no longer the validated immutable source",
              );
            }
          }
          throw destinationError;
        }
      }
    },

    async deleteObject({ key, abortSignal }) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal });
      } catch (error) {
        if (!isMissingObjectError(error)) throw error;
      }
    },
  };
};

export {
  createS3MerchantUploadStorage,
  encodeCopySource,
  hasSignature,
  isMissingObjectError,
  StaleMerchantUploadError,
  readRequiredConfig,
};
export type { S3CommandTransport };
