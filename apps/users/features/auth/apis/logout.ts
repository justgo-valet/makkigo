import { apiClient } from "@/libs/common/api/apiClient";

const logout = async () => {
  await apiClient.post("auth/logout");
};

export { logout };
