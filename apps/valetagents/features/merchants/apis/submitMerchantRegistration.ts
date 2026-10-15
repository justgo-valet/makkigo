import { apiClient } from "@/libs/common/api/apiClient";

import type { MerchantRegistrationBody } from "@/libs/merchant/contracts/registration";

const SUBMIT_TIMEOUT_MS = 30_000;

interface MerchantRegistrationSubmission {
  idempotencyKey: string;
  body: MerchantRegistrationBody;
}

const submitMerchantRegistration = async ({
  idempotencyKey,
  body,
}: MerchantRegistrationSubmission): Promise<{ status: number; code: string | null }> => {
  const response = await apiClient.post("merchants", {
    json: body,
    headers: { "Idempotency-Key": idempotencyKey },
    throwHttpErrors: false,
    timeout: SUBMIT_TIMEOUT_MS,
  });
  const data = await response.json<unknown>().catch(() => null);
  const code =
    typeof data === "object" && data !== null && "code" in data && typeof data.code === "string"
      ? data.code
      : null;

  return { status: response.status, code };
};

export { submitMerchantRegistration };
export type { MerchantRegistrationSubmission };
