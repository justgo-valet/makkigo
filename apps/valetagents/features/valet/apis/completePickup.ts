import { apiClient } from "@/libs/common/api/apiClient";

const completePickup = async (boothId: number, sessionId: number): Promise<void> => {
  await apiClient.post(`booths/${boothId}/valet-sessions/${sessionId}/complete`);
};

export { completePickup };
