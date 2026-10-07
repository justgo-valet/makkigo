import { apiClient } from "@/libs/common/api/apiClient";

import type { CheckPhoneNumberRequest } from "@/libs/onboarding/contracts/onboarding";

const checkPhoneNumber = async (request: CheckPhoneNumberRequest) => {
  await apiClient.post("onboarding/phone-number/check", { json: request });
};

export { checkPhoneNumber };
