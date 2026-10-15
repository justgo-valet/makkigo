import { z } from "zod";

import { apiClient } from "@/libs/common/api/apiClient";

import type { MerchantImageReservationBody } from "@/libs/merchant/contracts/image-upload";

const SEND_TIMEOUT_MS = 60_000;

const reservationSchema = z.object({
  uploadId: z.string().uuid(),
  upload: z.object({ url: z.string().url(), fields: z.record(z.string(), z.string()) }),
});

type MerchantImageReservation = z.infer<typeof reservationSchema>;

const reserveMerchantImage = async (
  body: MerchantImageReservationBody,
): Promise<MerchantImageReservation> => {
  const response = await apiClient
    .post("merchant-image-uploads/presign", { json: body })
    .json<unknown>();

  return reservationSchema.parse(response);
};

const sendMerchantImage = async (
  { url, fields }: MerchantImageReservation["upload"],
  file: File,
): Promise<void> => {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("이미지를 올리지 못했습니다.");
};

const removeMerchantImage = async (sessionId: string, uploadId: string): Promise<void> => {
  await apiClient.delete(`merchant-registration-sessions/${sessionId}/uploads/${uploadId}`);
};

export { removeMerchantImage, reserveMerchantImage, sendMerchantImage };
