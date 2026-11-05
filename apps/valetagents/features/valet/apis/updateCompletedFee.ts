import { apiClient } from "@/libs/common/api/apiClient";

const updateCompletedFee = async (boothId: number, sessionId: number, fee: number) => {
  await apiClient.put(`booths/${boothId}/valet-sessions/${sessionId}/fee`, { json: { fee } });
};

export { updateCompletedFee };
