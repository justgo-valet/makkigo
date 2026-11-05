import { apiClient } from "@/libs/common/api/apiClient";

const resetRole = async () => {
  await apiClient.delete("onboarding");
};

export { resetRole };
