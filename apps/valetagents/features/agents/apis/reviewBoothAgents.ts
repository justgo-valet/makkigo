import { apiClient } from "@/libs/common/api/apiClient";

import type { BoothAgentReviewBody } from "../schemas/agents";

const reviewBoothAgents = async (boothId: number, body: BoothAgentReviewBody): Promise<void> => {
  await apiClient.patch(`booths/${boothId}/agents`, { json: body });
};

export { reviewBoothAgents };
