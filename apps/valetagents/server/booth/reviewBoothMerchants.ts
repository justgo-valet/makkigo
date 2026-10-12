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
