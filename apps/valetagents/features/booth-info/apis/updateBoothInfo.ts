import { uploadBoothPhotos } from "@/features/onboarding/apis/createBooth";
import { apiClient } from "@/libs/common/api/apiClient";

import type { UpdateBoothInfoInput } from "@/libs/booth/contracts/booth-info";

type UpdateBoothInfoRequest = Omit<UpdateBoothInfoInput, "photoUploads"> & { photos: File[] };

const updateBoothInfo = async (
  boothId: number,
  { photos, ...input }: UpdateBoothInfoRequest,
): Promise<void> => {
  const photoUploads = photos.length > 0 ? await uploadBoothPhotos(photos) : [];
  await apiClient.put(`booths/${boothId}`, { json: { ...input, photoUploads }, timeout: 180_000 });
};

export { updateBoothInfo };
