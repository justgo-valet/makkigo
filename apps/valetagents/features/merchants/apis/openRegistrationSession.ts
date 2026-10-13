import { z } from "zod";

import { apiClient } from "@/libs/common/api/apiClient";

const responseSchema = z.object({
  code: z.string(),
  sessionId: z.string().uuid().optional(),
});

type RegistrationSession =
  | { kind: "open"; sessionId: string }
  | { kind: "unresolved" }
  | { kind: "pending" };

const openRegistrationSession = async (): Promise<RegistrationSession> => {
  const response = await apiClient.post("merchant-registration-sessions", {
    throwHttpErrors: (status) => status !== 403 && status !== 409,
  });
  const { code, sessionId } = responseSchema.parse(await response.json<unknown>());

  if (code === "MERCHANT_APPROVAL_PENDING") return { kind: "pending" };
  if (code === "UNRESOLVED_SUBMISSION") return { kind: "unresolved" };
  if (!response.ok || !sessionId) throw new Error("업체 등록 세션을 열지 못했습니다.");
  return { kind: "open", sessionId };
};

export { openRegistrationSession };
