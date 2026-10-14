import { apiClient } from "@/libs/common/api/apiClient";

const parkValetSession = async (boothId: number, sessionId: number): Promise<void> => {
  await apiClient.post(`booths/${boothId}/valet-sessions/${sessionId}/park`);
};

export { parkValetSession };
