import { apiClient } from "@/libs/common/api/apiClient";

import type { RecordConsentsRequest } from "@/libs/consent/contracts/consents";

const recordConsents = async (request: RecordConsentsRequest) => {
  await apiClient.post("consents", { json: request });
};

export { recordConsents };
