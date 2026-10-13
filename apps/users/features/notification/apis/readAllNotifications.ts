import { apiClient } from "@/libs/common/api/apiClient";

const readAllNotifications = async () => {
  await apiClient.post("notifications/read");
};

export { readAllNotifications };
