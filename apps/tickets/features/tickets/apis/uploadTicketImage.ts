import { getErrorMessage } from "@makkigo/api-client";

import { apiClient } from "@/libs/common/apiClient";
import { MAX_TICKET_IMAGE_BYTES, ticketImageMimeTypes } from "@/libs/ticket/contracts";

import type { TicketImageMimeType } from "@/libs/ticket/contracts";

const isTicketImageType = (type: string): type is TicketImageMimeType =>
  ticketImageMimeTypes.some((mimeType) => mimeType === type);

export const uploadTicketImage = async (merchantId: number, file: File) => {
  if (!isTicketImageType(file.type) || file.size < 1 || file.size > MAX_TICKET_IMAGE_BYTES) {
    throw new Error("JPEG, PNG, WebP 이미지를 5MB 이하로 올려 주세요.");
  }
  try {
    const reservation = await apiClient
      .post("ticket-image-uploads/presign", { json: { merchantId, contentType: file.type, size: file.size } })
      .json<{ uploadId: string; upload: { url: string; fields: Record<string, string> } }>();
    const form = new FormData();
    Object.entries(reservation.upload.fields).forEach(([name, value]) => form.append(name, value));
    form.append("file", file);
    const uploaded = await fetch(reservation.upload.url, { method: "POST", body: form });
    if (!uploaded.ok) throw new Error("이미지를 올리지 못했어요.");
    const { assetPath } = await apiClient
      .post("ticket-image-uploads/complete", { json: { uploadId: reservation.uploadId } })
      .json<{ assetPath: string }>();
    return assetPath;
  } catch (cause) {
    throw new Error(getErrorMessage(cause, "이미지를 올리지 못했어요."));
  }
};
