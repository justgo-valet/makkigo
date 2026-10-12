import { apiClient } from "@/libs/common/api/apiClient";

import type { CreateBoothInput } from "@/libs/booth/contracts/create-booth";

const createBooth = async (input: CreateBoothInput): Promise<void> => {
  await apiClient.post("booths", { json: input });
};

export { createBooth };
