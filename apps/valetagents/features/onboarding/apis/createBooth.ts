import { apiClient } from "@/libs/common/api/apiClient";

import type { CreateBoothInput } from "@/libs/booth/contracts/create-booth";
import type { BoothPhotoUploadMetadata } from "@/libs/booth/contracts/photos";

type CreateBoothRequest = CreateBoothInput & { photos?: File[] };

interface BoothPhotoPresignResponse {
  uploads: (BoothPhotoUploadMetadata & {
    post: { url: string; fields: Record<string, string> };
  })[];
}

const uploadBoothPhotos = async (photos: File[]): Promise<BoothPhotoUploadMetadata[]> => {
  const { uploads } = await apiClient
    .post("booth-image-uploads/presign", {
      json: { uploads: photos.map(({ type: contentType, size }) => ({ contentType, size })) },
    })
    .json<BoothPhotoPresignResponse>();

  return Promise.all(uploads.map(async (upload, index) => {
    const photo = photos[index];
    if (!photo) throw new Error("사진 업로드 정보를 확인할 수 없습니다.");
    const form = new FormData();
    for (const [name, value] of Object.entries(upload.post.fields)) form.append(name, value);
    form.append("file", photo);
    const response = await fetch(upload.post.url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error("사진을 업로드하지 못했어요. 다시 시도해 주세요.");
    return { uploadId: upload.uploadId, contentType: upload.contentType, size: upload.size };
  }));
};

const createBooth = async ({ photos = [], ...input }: CreateBoothRequest): Promise<void> => {
  const photoUploads = photos.length > 0 ? await uploadBoothPhotos(photos) : undefined;
  await apiClient.post("booths", {
    json: { ...input, ...(photoUploads ? { photoUploads } : {}) },
    timeout: 180_000,
  });
};

export { createBooth, uploadBoothPhotos };
export type { CreateBoothRequest };
