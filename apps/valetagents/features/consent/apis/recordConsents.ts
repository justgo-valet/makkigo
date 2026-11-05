import { apiClient } from "@/libs/common/api/apiClient";

const recordConsents = async () => {
  await apiClient.post("staff/me/consents");
};

export { recordConsents };
