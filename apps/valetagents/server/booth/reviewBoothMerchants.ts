import "server-only";

import { prisma } from "database";

import { getBoothManagerFailure } from "./boothManager";

import type { BoothManagerFailure } from "./boothManager";
import type { BoothMerchantReviewBody } from "@/libs/booth/contracts/booth-merchants";

type ReviewAbortReason = "MERCHANT_NOT_FOUND" | "MERCHANT_CHANGED" | "MERCHANT_ALREADY_APPROVED";

type ReviewBoothMerchantsResult =
  | { ok: true }
  | { ok: false; reason: BoothManagerFailure | ReviewAbortReason };

class ReviewAbortedError extends Error {
  constructor(readonly reason: ReviewAbortReason) {
    super(reason);
  }
}

// 고른 업체 전부를 한 번에 바꾸거나 하나도 바꾸지 않는다.
// 관리자가 목록을 본 뒤 계약 행이 바뀌었으면(updatedAt 이 다르면) 바꾸지 않고 다시 확인하게 한다.
// 이미 등록된 업체는 거절할 수 없다.
// 겹친 두 요청이 같은 계약 행들을 서로 다른 순서로 잠가 교착되지 않도록 업체 id 순으로 처리한다.
// 늦은 쪽은 updatedAt 조건에 걸려 MERCHANT_CHANGED 로 끝난다.
const reviewBoothMerchants = async (
  staffId: number,
  boothId: number,
  { status, merchants }: BoothMerchantReviewBody,
): Promise<ReviewBoothMerchantsResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  try {
    await prisma.$transaction(async (transaction) => {
      for (const merchant of [...merchants].sort((left, right) => left.id - right.id)) {
        const seenUpdatedAt = new Date(merchant.updatedAt);
        const current = await transaction.boothMerchant.findFirst({
          where: { boothId, merchantId: merchant.id, merchant: { deletedAt: null } },
          select: { status: true, updatedAt: true },
        });

        if (!current) throw new ReviewAbortedError("MERCHANT_NOT_FOUND");
        if (current.updatedAt.getTime() !== seenUpdatedAt.getTime()) {
          throw new ReviewAbortedError("MERCHANT_CHANGED");
        }
        if (current.status === status) continue;
        if (current.status === "APPROVED") throw new ReviewAbortedError("MERCHANT_ALREADY_APPROVED");

        const { count } = await transaction.boothMerchant.updateMany({
          where: { boothId, merchantId: merchant.id, updatedAt: seenUpdatedAt },
          data: { status },
        });
        if (count === 0) throw new ReviewAbortedError("MERCHANT_CHANGED");
      }
    });
  } catch (error) {
    if (error instanceof ReviewAbortedError) return { ok: false, reason: error.reason };
    throw error;
  }

  return { ok: true };
};

export { reviewBoothMerchants };
export type { ReviewBoothMerchantsResult };
