import { apiClient } from "@/libs/common/api/apiClient";
import {
  recordConsentsRequestSchema,
  type RecordConsentsRequest,
} from "@/libs/consent/contracts/consents";

const recordConsents = async (request: RecordConsentsRequest) => {
  const parsedRequest = recordConsentsRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new Error("유효하지 않은 요청입니다.");
  }
  await apiClient.post("consents", { json: parsedRequest.data });
};

export { recordConsents };
