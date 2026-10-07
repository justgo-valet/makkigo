import { apiClient } from "@/libs/common/api/apiClient";
import { meResponseSchema } from "@/libs/user/contracts/me";

const getMe = async () => meResponseSchema.parse(await apiClient.get("users/me").json());

export { getMe };
