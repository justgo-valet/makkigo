import { apiClient } from "@/libs/common/api/apiClient";
import { profileResponseSchema } from "@/libs/user/contracts/profile";

const getProfile = async () =>
  profileResponseSchema.parse(await apiClient.get("users/me/profile").json());

export { getProfile };
