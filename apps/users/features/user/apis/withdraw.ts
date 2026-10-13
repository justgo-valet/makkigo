import { apiClient } from "@/libs/common/api/apiClient";

const withdraw = async () => {
  await apiClient.delete("users/me");
};

export { withdraw };
