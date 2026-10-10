import { boothAgentListResponseSchema } from "@/libs/booth/contracts/agents";

import type {
  BoothAgent,
  BoothAgentListResponse,
  BoothAgentReviewBody,
} from "@/libs/booth/contracts/agents";

const parseBoothAgentListResponse = (value: unknown): BoothAgentListResponse => {
  const result = boothAgentListResponseSchema.safeParse(value);
  if (!result.success) throw new Error("유효하지 않은 요원 목록 응답입니다.");
  return result.data;
};

export { parseBoothAgentListResponse };
export type { BoothAgent, BoothAgentListResponse, BoothAgentReviewBody };
