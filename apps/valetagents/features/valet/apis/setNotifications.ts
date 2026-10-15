import { apiClient } from "@/libs/common/api/apiClient";

const setNotifications = async (boothId: number, enabled: boolean): Promise<void> => {
  await apiClient.put(`booths/${boothId}/agents/me/notifications`, { json: { enabled } });
};

export { setNotifications };
