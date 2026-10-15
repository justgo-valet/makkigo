import "server-only";

import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";

import type { BoothPhotoUploadMetadata } from "@/libs/booth/contracts/photos";
import type { MerchantUploadStorage } from "@/server/merchantUploads/storage";

interface BoothPhotoStorageOptions {
  storage: MerchantUploadStorage;
}

const extensionFor = (contentType: BoothPhotoUploadMetadata["contentType"]) =>
  contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";

const boothPhotoKeys = (staffId: number, upload: BoothPhotoUploadMetadata, finalId = upload.uploadId) => {
  const stagingFilename = `${upload.uploadId}.${extensionFor(upload.contentType)}`;
  const finalFilename = `${finalId}.${extensionFor(upload.contentType)}`;
  return {
    stagingKey: `booths/staging/${staffId}/${stagingFilename}`,
    finalKey: `booths/final/${staffId}/${finalFilename}`,
  };
};

const createBoothPhotoStorage = (options?: Partial<BoothPhotoStorageOptions>) => {
  const storage = options?.storage ?? createS3MerchantUploadStorage();

  return {
    createUploadPost(staffId: number, upload: BoothPhotoUploadMetadata) {
      const { stagingKey } = boothPhotoKeys(staffId, upload);
      return storage.createUploadPost({
        key: stagingKey,
        contentType: upload.contentType,
        expiresInSeconds: 300,
      });
    },

    async promote(staffId: number, upload: BoothPhotoUploadMetadata, finalId = upload.uploadId) {
      const keys = boothPhotoKeys(staffId, upload, finalId);
      const abortSignal = AbortSignal.timeout(15_000);
      const source = await storage.inspectObject(
        keys.stagingKey,
        { size: upload.size, contentType: upload.contentType },
        abortSignal,
      );
      await storage.copyUpload({
        sourceKey: keys.stagingKey,
        destinationKey: keys.finalKey,
        sourceETag: source.etag,
        contentType: upload.contentType,
        size: upload.size,
        sessionId: upload.uploadId,
        uploadId: upload.uploadId,
        abortSignal: AbortSignal.timeout(15_000),
      });
      return keys;
    },

    delete(key: string) {
      return storage.deleteObject({ key, abortSignal: AbortSignal.timeout(10_000) });
    },
  };
};

export { boothPhotoKeys, createBoothPhotoStorage };
export type { BoothPhotoStorageOptions };
