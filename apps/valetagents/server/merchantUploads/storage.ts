import type { MerchantImageMimeType } from "@/libs/merchant/contracts/image-upload";

interface MerchantUploadObjectMetadata {
  key: string;
  size: number;
  contentType: MerchantImageMimeType;
  etag: string;
  metadata: Record<string, string>;
}

interface CreateUploadPostInput {
  key: string;
  contentType: MerchantImageMimeType;
  expiresInSeconds: number;
}

interface CopyUploadInput {
  sourceKey: string;
  destinationKey: string;
  sourceETag: string;
  contentType: MerchantImageMimeType;
  size: number;
  sessionId: string;
  uploadId: string;
  abortSignal?: AbortSignal;
}

interface DeleteUploadObjectInput {
  key: string;
  abortSignal?: AbortSignal;
}

interface MerchantUploadStorage {
  createUploadPost(input: CreateUploadPostInput): Promise<{ url: string; fields: Record<string, string> }>;
  inspectObject(
    key: string,
    expected: { size: number; contentType: MerchantImageMimeType },
    abortSignal?: AbortSignal,
  ): Promise<MerchantUploadObjectMetadata>;
  copyUpload(input: CopyUploadInput): Promise<{ etag: string }>;
  deleteObject(input: DeleteUploadObjectInput): Promise<void>;
}

export type {
  CopyUploadInput,
  CreateUploadPostInput,
  DeleteUploadObjectInput,
  MerchantUploadObjectMetadata,
  MerchantUploadStorage,
};
