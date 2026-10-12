import "server-only";

import { prisma } from "database";

import { getBoothManagerFailure } from "./boothManager";

import type { BoothManagerFailure } from "./boothManager";
import type { BoothAgentReviewBody } from "@/libs/booth/contracts/agents";

type ReviewAbortReason = "AGENT_NOT_FOUND" | "AGENT_CHANGED" | "AGENT_ALREADY_APPROVED";

type ReviewBoothAgentsResult =
  | { ok: true }
  | { ok: false; reason: BoothManagerFailure | ReviewAbortReason };

class ReviewAbortedError extends Error {
  constructor(readonly reason: ReviewAbortReason) {
    super(reason);
  }
}

// 고른 요원 전부를 한 번에 바꾸거나 하나도 바꾸지 않는다.
// 관리자가 목록을 본 뒤 요원이 요청을 고쳤으면(updatedAt 이 다르면) 바꾸지 않고 다시 확인하게 한다.
// 이미 등록된 요원은 거절할 수 없다.
const reviewBoothAgents = async (
  staffId: number,
  boothId: number,
  { status, agents }: BoothAgentReviewBody,
): Promise<ReviewBoothAgentsResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  try {
    await prisma.$transaction(async (transaction) => {
      for (const agent of [...agents].sort((left, right) => left.id - right.id)) {
        const seenUpdatedAt = new Date(agent.updatedAt);
        const current = await transaction.boothAgent.findFirst({
          where: { id: agent.id, boothId, staff: { deletedAt: null } },
          select: { status: true, updatedAt: true },
        });

        if (!current) throw new ReviewAbortedError("AGENT_NOT_FOUND");
        if (current.updatedAt.getTime() !== seenUpdatedAt.getTime()) {
          throw new ReviewAbortedError("AGENT_CHANGED");
        }
        if (current.status === status) continue;
        if (current.status === "APPROVED") throw new ReviewAbortedError("AGENT_ALREADY_APPROVED");

        const { count } = await transaction.boothAgent.updateMany({
          where: { id: agent.id, boothId, updatedAt: seenUpdatedAt },
          data: { status },
        });
        if (count === 0) throw new ReviewAbortedError("AGENT_CHANGED");
      }
    });
  } catch (error) {
    if (error instanceof ReviewAbortedError) return { ok: false, reason: error.reason };
    throw error;
  }

  return { ok: true };
};

export { reviewBoothAgents };
export type { ReviewBoothAgentsResult };
