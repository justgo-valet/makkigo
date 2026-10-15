import { apiClient } from "@/libs/common/api/apiClient";

const cancelArrival = async (valetSessionId: number) => {
  await apiClient.post(`valet-sessions/${valetSessionId}/cancel`);
};

export { cancelArrival };
