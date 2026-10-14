import { boothValetSessionListResponseSchema } from "@/libs/valet/contracts/sessions";

import type {
  BoothValetSession,
  BoothValetSessionListResponse,
  ValetFee,
} from "@/libs/valet/contracts/sessions";

const parseBoothValetSessionListResponse = (value: unknown): BoothValetSessionListResponse => {
  const result = boothValetSessionListResponseSchema.safeParse(value);
  if (!result.success) throw new Error("유효하지 않은 차량 목록 응답입니다.");
  return result.data;
};

export { parseBoothValetSessionListResponse };
export type { BoothValetSession, BoothValetSessionListResponse, ValetFee };
