import { getErrorMessage } from "@makkigo/api-client";

import { apiClient } from "@/libs/common/apiClient";
import { MAX_MERCHANT_PHOTO_BYTES, merchantPhotoMimeTypes } from "@/libs/merchant/contracts";

import type { MerchantPhotoMimeType } from "@/libs/merchant/contracts";

const isMerchantPhotoType = (type: string): type is MerchantPhotoMimeType =>
  merchantPhotoMimeTypes.some((mimeType) => mimeType === type);

export const uploadMerchantPhoto = async (merchantId: number, file: File) => {
  if (!isMerchantPhotoType(file.type) || file.size < 1 || file.size > MAX_MERCHANT_PHOTO_BYTES) {
    throw new Error("JPEG, PNG, WebP 이미지를 5MB 이하로 올려 주세요.");
  }
  try {
    const reservation = await apiClient
      .post(`merchants/${merchantId}/photos/presign`, { json: { contentType: file.type, size: file.size } })
      .json<{ key: string; upload: { url: string; fields: Record<string, string> } }>();
    const form = new FormData();
    Object.entries(reservation.upload.fields).forEach(([name, value]) => form.append(name, value));
    form.append("file", file);
    const uploaded = await fetch(reservation.upload.url, { method: "POST", body: form });
    if (!uploaded.ok) throw new Error("사진을 올리지 못했어요.");
    await apiClient.post(`merchants/${merchantId}/photos`, { json: { key: reservation.key } });
  } catch (cause) {
    throw new Error(getErrorMessage(cause, cause instanceof Error ? cause.message : "사진을 올리지 못했어요."));
  }
};
